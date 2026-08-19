import { useState, useEffect, useRef, useCallback } from 'react'
import * as mediasoupClient from 'mediasoup-client'
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Loader, RotateCcw } from 'lucide-react'
import './VideoCall.css'

const WS_URL = import.meta.env.VITE_MEDIASOUP_WS_URL || (() => {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${location.host}/ws/mediasoup`
})()

// Global counters are only used for uniqueness; all per-call state lives in refs.
let wsIdCounter = 0
const pendingReplies = []

function closeWs(ws) {
    if (!ws) return
    ws.onopen = null
    ws.onmessage = null
    ws.onerror = null
    ws.onclose = null
    if (ws.readyState === WebSocket.OPEN) {
        ws.close()
    }
}

function cleanPending(keepId) {
  for (let i = pendingReplies.length - 1; i >= 0; i--) {
    const e = pendingReplies[i]
    if (e.done || e.wsId === keepId) continue
    e.done = true
    clearTimeout(e.tid)
    pendingReplies.splice(i, 1)
    e.resolve(null)
  }
}

function requestResponse(ws, wsId, msg, filter, timeoutMs = 15000) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket closed')
    }
    return new Promise((resolve, reject) => {
        const entry = { wsId, filter, resolve, reject, done: false }
        pendingReplies.push(entry)
        entry.tid = setTimeout(() => {
            if (entry.done) return
            entry.done = true
            const idx = pendingReplies.indexOf(entry)
            if (idx >= 0) pendingReplies.splice(idx, 1)
            reject(new Error('Timeout'))
        }, timeoutMs)
        try { ws.send(JSON.stringify(msg)) } catch (e) {
            entry.done = true
            clearTimeout(entry.tid)
            const idx = pendingReplies.indexOf(entry)
            if (idx >= 0) pendingReplies.splice(idx, 1)
            reject(e)
        }
    })
}

function routeMessage(msg, currentWsId) {
  let lastIdx = -1
  let lastEntry = null
  for (let i = 0; i < pendingReplies.length; i++) {
    const e = pendingReplies[i]
    if (e.done || e.wsId !== currentWsId) continue
    if (msg.type === 'error') {
      lastIdx = i
      lastEntry = e
      continue
    }
    try {
      if (e.filter(msg)) {
        e.done = true
        clearTimeout(e.tid)
        pendingReplies.splice(i, 1)
        e.resolve(msg)
        return true
      }
    } catch { /* filter threw */ }
  }
  if (msg.type === 'error' && lastEntry) {
    lastEntry.done = true
    clearTimeout(lastEntry.tid)
    pendingReplies.splice(lastIdx, 1)
    lastEntry.reject(new Error(msg.message))
    return true
  }
  return false
}

export default function VideoCall({ roomId, onClose, onError }) {
    const callRoomId = roomId || 'fitpower-main'
    const [localStream, setLocalStream] = useState(null)
    const [remoteStreams, setRemoteStreams] = useState([])
    const [micEnabled, setMicEnabled] = useState(true)
    const [camEnabled, setCamEnabled] = useState(true)
    const [connecting, setConnecting] = useState(true)
    const [connected, setConnected] = useState(false)
    const [connError, setConnError] = useState(null)
    const [screenSharing, setScreenSharing] = useState(false)

    const localVideoRef = useRef(null)
    const videoTrackRef = useRef(null)
    const audioTrackRef = useRef(null)
    const wsRef = useRef(null)
    const deviceRef = useRef(null)
    const sendTransportRef = useRef(null)
    const recvTransportRef = useRef(null)
    const localStreamRef = useRef(null)
    const producersRef = useRef({})
    const consumersRef = useRef({})
    const consumerPeerRef = useRef({})
    const timeoutRef = useRef(null)
    const myPeerIdRef = useRef(null)
    const retryCountRef = useRef(0)
    const connErrorRef = useRef(null)
    const mountRef = useRef(null)
    const fakeRafRef = useRef(null)
    const isScreenSharingRef = useRef(false)
    const maxRetries = 3

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream])

    // Release every acquired resource (media, transports, producers, consumers,
    // fake-video rAF) before a retry or unmount so nothing leaks.
    const releaseResources = useCallback(() => {
        if (fakeRafRef.current) {
            cancelAnimationFrame(fakeRafRef.current)
            fakeRafRef.current = null
        }
        Object.values(producersRef.current).forEach(p => { try { p?.close() } catch { /* noop */ } })
        producersRef.current = {}
        Object.values(consumersRef.current).forEach(c => { try { c?.close() } catch { /* noop */ } })
        consumersRef.current = {}
        consumerPeerRef.current = {}
        try { sendTransportRef.current?.close() } catch { /* noop */ }
        try { recvTransportRef.current?.close() } catch { /* noop */ }
        sendTransportRef.current = null
        recvTransportRef.current = null
        localStreamRef.current?.getTracks().forEach(t => { try { t.stop() } catch { /* noop */ } })
        localStreamRef.current = null
        closeWs(wsRef.current)
        wsRef.current = null
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }, [])

    const initCall = useCallback(async () => {
        const mount = {}
        mountRef.current = mount

        // A retry is a fresh attempt: clear any previous error state.
        connErrorRef.current = null
        setConnError(null)
        setConnecting(true)
        setConnected(false)
        releaseResources()

        const token = localStorage.getItem('token')

        let stream
        if (!navigator.mediaDevices) {
            const msg = window.location.protocol === 'https:'
                        ? 'Media devices are not available in this browser'
                : 'Video calls require HTTPS. Access via https://'
            setConnError(msg)
            setConnecting(false)
            onError?.(msg)
            return
        }
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            })
        } catch {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const canvas = document.createElement('canvas')
                canvas.width = 640
                canvas.height = 480
                const ctx = canvas.getContext('2d')
                let frame = 0
                function drawFake() {
                    if (mountRef.current !== mount) return
                    frame++
                    ctx.fillStyle = '#1a1a2e'
                    ctx.fillRect(0, 0, 640, 480)
                    ctx.fillStyle = '#fff'
                    ctx.font = 'bold 22px Arial'
                    ctx.textAlign = 'center'
                    ctx.fillText('Camera unavailable', 320, 180)
                    ctx.font = '16px Arial'
                    ctx.fillText(`Frame: ${frame}`, 320, 260)
                    fakeRafRef.current = requestAnimationFrame(drawFake)
                }
                drawFake()
                const track = canvas.captureStream(30).getVideoTracks()[0]
                if (track) stream.addTrack(track)
            } catch {
                if (mountRef.current !== mount) return
                setConnError('Could not access camera or microphone')
                setConnecting(false)
                return
            }
        }

        if (mountRef.current !== mount) return

        if (!token) {
            setConnError('No authentication token')
            setConnecting(false)
            return
        }

        localStreamRef.current = stream
        setLocalStream(stream)

        const audioTrack = stream.getAudioTracks()[0]
        const videoTrack = stream.getVideoTracks()[0]
        audioTrackRef.current = audioTrack
        videoTrackRef.current = videoTrack

        const wsId = ++wsIdCounter
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        function fail(msg) {
            if (mountRef.current !== mount) return
            setConnError(msg)
            setConnecting(false)
            closeWs(ws)
        }

        timeoutRef.current = setTimeout(() => {
            if (mountRef.current !== mount) return
            fail('Video call server is not responding (timeout)')
        }, 8000)

      async function handleMsg(msg) {
        if (mountRef.current !== mount) return

        if (routeMessage(msg, wsId)) return

        switch (msg.type) {
          case 'auth_ok': {
            ws.send(JSON.stringify({ type: 'join_room', roomId: callRoomId }))
            break
          }

          case 'room_joined': {
            myPeerIdRef.current = msg.peerId
            try {
              const device = new mediasoupClient.Device()
              deviceRef.current = device
              await device.load({ routerRtpCapabilities: msg.rtpCapabilities })
              if (mountRef.current !== mount) break

              const sendResp = await requestResponse(ws, wsId,
                { type: 'create_transport', direction: 'send' },
                d => d.type === 'transport_created' && d.direction === 'send'
              )
              if (mountRef.current !== mount || !sendResp) break

              const sendTransport = device.createSendTransport({
                id: sendResp.id,
                iceParameters: sendResp.iceParameters,
                iceCandidates: sendResp.iceCandidates,
                dtlsParameters: sendResp.dtlsParameters,
                sctpParameters: sendResp.sctpParameters,
                iceServers: sendResp.iceServers || [],
              })
              sendTransportRef.current = sendTransport

              const recvResp = await requestResponse(ws, wsId,
                { type: 'create_transport', direction: 'recv' },
                d => d.type === 'transport_created' && d.direction === 'recv'
              )
              if (mountRef.current !== mount || !recvResp) break

              const recvTransport = device.createRecvTransport({
                id: recvResp.id,
                iceParameters: recvResp.iceParameters,
                iceCandidates: recvResp.iceCandidates,
                dtlsParameters: recvResp.dtlsParameters,
                sctpParameters: recvResp.sctpParameters,
                iceServers: recvResp.iceServers || [],
              })
              recvTransportRef.current = recvTransport

              sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                  const resp = await requestResponse(ws, wsId,
                    { type: 'connect_transport', direction: 'send', transportId: sendTransport.id, dtlsParameters },
                    d => d.type === 'transport_connected' && d.direction === 'send'
                  )
                  if (resp) callback()
                  else errback(new Error('No response'))
                } catch (e) {
                  errback(e)
                }
              })

              sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
                try {
                  const resp = await requestResponse(ws, wsId,
                    { type: 'produce', kind, rtpParameters, appData },
                    d => d.type === 'produced' && d.kind === kind
                  )
                  if (resp) callback({ id: resp.id })
                  else errback(new Error('No response'))
                } catch {
                  errback(new Error('Produce timeout'))
                }
              })

              sendTransport.on('connectionstatechange', (state) => {
                if (state === 'failed' && import.meta.env.DEV) console.warn('[VC] send transport failed')
              })

              recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                  const resp = await requestResponse(ws, wsId,
                    { type: 'connect_transport', direction: 'recv', transportId: recvTransport.id, dtlsParameters },
                    d => d.type === 'transport_connected' && d.direction === 'recv'
                  )
                  if (resp) callback()
                  else errback(new Error('No response'))
                } catch (e) {
                  errback(e)
                }
              })

              recvTransport.on('connectionstatechange', (state) => {
                if (state === 'failed' && import.meta.env.DEV) console.warn('[VC] recv transport failed')
              })

              const localStream = localStreamRef.current
              if (localStream) {
                for (const track of localStream.getTracks()) {
                  if (track.kind === 'audio' || track.kind === 'video') {
                    const producer = await sendTransport.produce({ track })
                    producersRef.current[producer.id] = producer
                  }
                }
              }
              if (mountRef.current !== mount) break

              for (const p of (msg.producers || [])) {
                if (p.peerId === myPeerIdRef.current) continue
                try {
                  const resp = await requestResponse(ws, wsId,
                    { type: 'consume', producerId: p.producerId, rtpCapabilities: device.rtpCapabilities },
                    d => d.type === 'consumed' && d.producerId === p.producerId
                  )
                  if (!resp) continue
                  const consumer = await recvTransport.consume({
                    id: resp.id,
                    producerId: resp.producerId,
                    kind: resp.kind,
                    rtpParameters: resp.rtpParameters,
                  })
                  consumersRef.current[consumer.id] = consumer
                  consumerPeerRef.current[consumer.id] = p.peerId
                  const s = new MediaStream([consumer.track])
                  setRemoteStreams(prev => {
                    const idx = prev.findIndex(x => x.peerId === p.peerId && x.kind === p.kind)
                    const upd = [...prev]
                    if (idx >= 0) { upd[idx] = { peerId: p.peerId, kind: p.kind, stream: s, producerId: p.producerId } }
                    else { upd.push({ peerId: p.peerId, kind: p.kind, stream: s, producerId: p.producerId }) }
                    return upd
                  })
                  ws.send(JSON.stringify({ type: 'resume_consumer', consumerId: consumer.id }))
                } catch (e) {
                  if (import.meta.env.DEV) console.warn('[VC] Failed to consume existing producer:', p.producerId, e.message)
                }
              }

              if (mountRef.current !== mount) break
              retryCountRef.current = 0
              connErrorRef.current = null
              setConnecting(false)
              setConnected(true)
            } catch (e) {
              // Setup failure must terminate the spinner and surface the error.
              if (mountRef.current !== mount) return
              setConnecting(false)
              const msg = `Room setup failed: ${e.message}`
              setConnError(msg)
              connErrorRef.current = msg
              onError?.(msg)
            }
            break
          }

          case 'new_peer': {
            // Peer presence is driven by its producers (new_producer events).
            break
          }

          case 'new_producer': {
            if (!deviceRef.current || !recvTransportRef.current) break
            try {
              const resp = await requestResponse(ws, wsId,
                { type: 'consume', producerId: msg.producerId, rtpCapabilities: deviceRef.current.rtpCapabilities },
                d => d.type === 'consumed' && d.producerId === msg.producerId
              )
              if (mountRef.current !== mount || !resp) break

              const consumer = await recvTransportRef.current.consume({
                id: resp.id,
                producerId: resp.producerId,
                kind: resp.kind,
                rtpParameters: resp.rtpParameters,
              })
              consumersRef.current[consumer.id] = consumer
              consumerPeerRef.current[consumer.id] = msg.peerId
              const stream = new MediaStream([consumer.track])
              setRemoteStreams(prev => {
                const idx = prev.findIndex(s => s.peerId === msg.peerId && s.kind === msg.kind)
                const upd = [...prev]
                if (idx >= 0) { upd[idx] = { peerId: msg.peerId, kind: msg.kind, stream, producerId: msg.producerId } }
                else { upd.push({ peerId: msg.peerId, kind: msg.kind, stream, producerId: msg.producerId }) }
                return upd
              })
              ws.send(JSON.stringify({ type: 'resume_consumer', consumerId: consumer.id }))
            } catch (e) {
              if (import.meta.env.DEV) console.warn('[VC] Failed to consume new producer:', e.message)
            }
            break
          }

          case 'peer_left': {
            // Close that peer's consumers so media actually stops flowing.
            for (const [id, peerId] of Object.entries(consumerPeerRef.current)) {
              if (Number(peerId) === Number(msg.peerId)) {
                try { consumersRef.current[id]?.close() } catch { /* noop */ }
                delete consumersRef.current[id]
                delete consumerPeerRef.current[id]
              }
            }
            setRemoteStreams(prev => prev.filter(s => Number(s.peerId) !== Number(msg.peerId)))
            break
          }

          case 'producer_closed': {
            for (const [id, c] of Object.entries(consumersRef.current)) {
              if (String(c.producerId) === String(msg.producerId)) {
                try { c.close() } catch { /* noop */ }
                delete consumersRef.current[id]
                delete consumerPeerRef.current[id]
              }
            }
            setRemoteStreams(prev => prev.filter(s => String(s.producerId) !== String(msg.producerId)))
            break
          }

          case 'error': {
            onError?.(msg.message)
            break
          }
        }
      }

      ws.onopen = () => {
        if (mountRef.current !== mount) return
        clearTimeout(timeoutRef.current)
        ws.send(JSON.stringify({ type: 'auth', token }))
      }

      ws.onmessage = async (event) => {
        if (mountRef.current !== mount) return
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'connected') return
          await handleMsg(msg)
        } catch { /* ignore */ }
      }

      ws.onclose = () => {
        if (mountRef.current !== mount) return
        clearTimeout(timeoutRef.current)
        setConnected(false)
        if (!connErrorRef.current && retryCountRef.current < maxRetries) {
          retryCountRef.current++
          const delay = 2000 * retryCountRef.current
          setConnecting(true)
          setTimeout(() => { if (mountRef.current === mount) initCall() }, delay)
        } else if (!connErrorRef.current) {
          setConnecting(false)
          setConnError('Connection lost. Please try again.')
          connErrorRef.current = 'Connection lost. Please try again.'
          onError?.('Connection lost after retries')
        } else {
          setConnecting(false)
        }
      }

      ws.onerror = () => {
        if (mountRef.current !== mount) return
        clearTimeout(timeoutRef.current)
        fail('Cannot connect to video call server.')
      }
    }, [callRoomId, onError, releaseResources])

    useEffect(() => {
        initCall()
        return () => {
            mountRef.current = null
            cleanPending(wsIdCounter + 1)
            releaseResources()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initCall])
    const retry = useCallback(() => {
        retryCountRef.current = 0
        initCall()
    }, [initCall])

    function toggleMic() {
        if (audioTrackRef.current) {
            audioTrackRef.current.enabled = !audioTrackRef.current.enabled
            setMicEnabled(audioTrackRef.current.enabled)
        }
    }

    function toggleCam() {
        if (videoTrackRef.current) {
            videoTrackRef.current.enabled = !videoTrackRef.current.enabled
            setCamEnabled(videoTrackRef.current.enabled)
        }
    }

    async function toggleScreenShare() {
        const localStream = localStreamRef.current
        if (!localStream) return
        const currentVideoTrack = videoTrackRef.current
        if (!currentVideoTrack) return

        if (isScreenSharingRef.current) {
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                })
                const newTrack = newStream.getVideoTracks()[0]
                localStream.removeTrack(currentVideoTrack)
                currentVideoTrack.stop()
                localStream.addTrack(newTrack)
                videoTrackRef.current = newTrack
                setLocalStream(new MediaStream([...localStream.getTracks()]))

                for (const p of Object.values(producersRef.current)) {
                    try { await p.replaceTrack({ track: newTrack }) } catch { /* ignore */ }
                }
                isScreenSharingRef.current = false
                setScreenSharing(false)
            } catch { /* ignore */ }
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
                const screenTrack = screenStream.getVideoTracks()[0]
                localStream.removeTrack(currentVideoTrack)
                currentVideoTrack.stop()
                localStream.addTrack(screenTrack)
                videoTrackRef.current = screenTrack
                setLocalStream(new MediaStream([...localStream.getTracks()]))

                for (const p of Object.values(producersRef.current)) {
                    try { await p.replaceTrack({ track: screenTrack }) } catch { /* ignore */ }
                }

                screenTrack.onended = () => toggleScreenShare()
                isScreenSharingRef.current = true
                setScreenSharing(true)
            } catch { /* user cancelled */ }
        }
    }

    function hangUp() {
        mountRef.current = null
        cleanPending(wsIdCounter + 1)
        releaseResources()
        onClose?.()
    }

    const remoteVideoRefs = useRef({})

    useEffect(() => {
        for (const rs of remoteStreams) {
            const key = `${rs.peerId}-${rs.kind}`
            const el = remoteVideoRefs.current[key]
            if (el && el.srcObject !== rs.stream) {
                el.srcObject = rs.stream
            }
        }
    }, [remoteStreams])

    const remoteVideos = remoteStreams.filter(rs => rs.kind === 'video')

    return (
        <div className="vc-container">
            {connecting && !connError && (
                <div className="vc-loading" role="status" aria-live="polite">
                    <Loader size={32} className="vc-spin" />
                    <span>Connecting to video call server...</span>
                </div>
            )}

            {connError ? (
                <div className="vc-error-state" role="alert" aria-live="assertive">
                    <VideoOff size={48} aria-hidden="true" />
                    <h3>Connection Failed</h3>
                    <p>{connError}</p>
                    <div className="vc-error-actions">
                        <button className="vc-retry-btn" onClick={retry} aria-label="Try connecting again">
                            <RotateCcw size={18} /> Try Again
                        </button>
                        <button className="vc-retry-btn vc-retry-secondary" onClick={hangUp} aria-label="Go back">
                            <PhoneOff size={18} /> Back
                        </button>
                    </div>
                </div>
            ) : (
                <div className="vc-grid">
                    <div className="vc-remote-area">
                        {connected && remoteVideos.length === 0 && (
                            <div className="vc-waiting">
                                <Video size={48} aria-hidden="true" />
                                <p>Waiting for others to join...</p>
                            </div>
                        )}
                        {!connected && !connecting && !connError && (
                            <div className="vc-waiting">
                                <Video size={48} aria-hidden="true" />
                                <p>Disconnected</p>
                            </div>
                        )}

                        {remoteVideos.map(rs => (
                            <div key={`${rs.peerId}-video`} className="vc-remote-video">
                                <video
                                    ref={el => { remoteVideoRefs.current[`${rs.peerId}-video`] = el }}
                                    autoPlay playsInline
                                    className="vc-video-el"
                                    aria-label="Remote participant video"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="vc-local-video">
                        <video ref={localVideoRef} autoPlay playsInline muted className="vc-video-el" aria-label="Your video" />
                        {!camEnabled && (
                            <div className="vc-cam-off">
                                <VideoOff size={24} aria-hidden="true" />
                            </div>
                        )}
                        <div className="vc-local-label">You</div>
                    </div>
                </div>
            )}

            {!connError && (
                <div className="vc-controls">
                    <button
                        className={`vc-ctrl-btn ${!micEnabled ? 'vc-ctrl-off' : ''}`}
                        onClick={toggleMic}
                        title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                        aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                        aria-pressed={!micEnabled}
                    >
                        {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                    <button
                        className={`vc-ctrl-btn ${!camEnabled ? 'vc-ctrl-off' : ''}`}
                        onClick={toggleCam}
                        title={camEnabled ? 'Turn off camera' : 'Turn on camera'}
                        aria-label={camEnabled ? 'Turn off camera' : 'Turn on camera'}
                        aria-pressed={!camEnabled}
                    >
                        {camEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                    </button>
                    <button
                        className={`vc-ctrl-btn ${screenSharing ? 'vc-ctrl-active' : ''}`}
                        onClick={toggleScreenShare}
                        title={screenSharing ? 'Stop sharing' : 'Share screen'}
                        aria-label={screenSharing ? 'Stop sharing screen' : 'Share screen'}
                        aria-pressed={screenSharing}
                    >
                        <Monitor size={20} />
                    </button>
                    <button className="vc-ctrl-btn vc-ctrl-hangup" onClick={hangUp} title="End call" aria-label="End call">
                        <PhoneOff size={20} />
                    </button>
                </div>
            )}
        </div>
    )
}
