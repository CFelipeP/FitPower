import { createWorker } from 'mediasoup'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import os from 'os'

const PORT = 5181
const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:8088'

function getLocalIp() {
    const ip = process.env.MEDIASOUP_ANNOUNCED_IP
    if (ip) return ip
    const ifaces = os.networkInterfaces()
    const virtualKeywords = ['vEthernet', 'Hyper-V', 'VirtualBox', 'VMware', 'Docker', 'Bluetooth', 'VPN']
    const candidates = []
    for (const name of Object.keys(ifaces)) {
        const isVirtual = virtualKeywords.some(k => name.includes(k))
        for (const iface of ifaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                candidates.push({ name, address: iface.address, priority: isVirtual ? 1 : 0 })
            }
        }
    }
    candidates.sort((a, b) => a.priority - b.priority)
    return candidates.length > 0 ? candidates[0].address : '127.0.0.1'
}
const ANNOUNCED_IP = getLocalIp()
console.log(`[Mediasoup] announced IP: ${ANNOUNCED_IP}`)
const TURN_URL = process.env.TURN_URL
const TURN_USERNAME = process.env.TURN_USERNAME || 'fitpower'
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL || 'fitpower_secret_2024'
const ICE_SERVERS = TURN_URL ? [{ urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL }] : []

const rooms = new Map()
let worker

createWorker({
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtx'],
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
}).then(w => {
    worker = w
    console.log(`[Mediasoup] worker pid: ${w.pid}`)
    server.listen(PORT, () => {
        console.log(`[Mediasoup] signaling on ws://localhost:${PORT}`)
    })
}).catch(err => {
    console.error('[Mediasoup] failed to create worker:', err)
    process.exit(1)
})


async function verifyToken(token) {
    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!data.success) return null
        return data.data
    } catch { return null }
}

const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }))
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
    ws.user = null
    ws.roomId = null

    ws.send(JSON.stringify({ type: 'connected', message: 'Mediasoup signaling ready' }))

    ws.on('message', async (raw) => {
        try {
            const msg = JSON.parse(raw)
            await handleSignaling(ws, msg)
        } catch (e) {
            console.error('[Mediasoup] handler error:', e)
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }))
        }
    })

    ws.on('close', () => {
        if (ws.roomId && ws.user) {
            const room = rooms.get(ws.roomId)
            if (room) {
                room.removePeer(ws.user.id)
                if (room.peerCount === 0) {
                    room.close()
                    rooms.delete(ws.roomId)
                    console.log(`[Mediasoup] room ${ws.roomId} closed`)
                } else {
                    room.notifyPeers('peer_left', { peerId: ws.user.id })
                }
            }
        }
    })
})

async function handleSignaling(ws, msg) {
    switch (msg.type) {
        case 'auth': {
            const user = await verifyToken(msg.token)
            if (!user) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }))
                return
            }
            ws.user = user
            ws.send(JSON.stringify({ type: 'auth_ok', userId: user.id, role: user.role }))
            break
        }

        case 'join_room': {
            if (!ws.user) {
                ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }))
                return
            }
            const { roomId } = msg
            if (!roomId) {
                ws.send(JSON.stringify({ type: 'error', message: 'roomId required' }))
                return
            }

            ws.roomId = roomId

            let room = rooms.get(roomId)
            if (!room) {
                const router = await worker.createRouter({
                    mediaCodecs: [
                        {
                            kind: 'audio',
                            mimeType: 'audio/opus',
                            clockRate: 48000,
                            channels: 2,
                        },
                        {
                            kind: 'video',
                            mimeType: 'video/VP8',
                            clockRate: 90000,
                        },
                        {
                            kind: 'video',
                            mimeType: 'video/VP9',
                            clockRate: 90000,
                        },
                        {
                            kind: 'video',
                            mimeType: 'video/H264',
                            clockRate: 90000,
                            parameters: {
                                'packetization-mode': 1,
                                'profile-level-id': '42e01f',
                                'level-asymmetry-allowed': 1,
                            },
                        },
                    ],
                })
                room = new Room(roomId, router)
                rooms.set(roomId, room)
                console.log(`[Mediasoup] room ${roomId} created`)
            }

            ws.send(JSON.stringify({
                type: 'room_joined',
                peerId: ws.user.id,
                roomId,
                peers: room.getPeerList(),
                producers: room.getAllProducers(),
                rtpCapabilities: room.router.rtpCapabilities,
            }))

            room.notifyPeers('new_peer', { peerId: ws.user.id, name: ws.user.name || `User ${ws.user.id}` }, ws.user.id)
            break
        }

        case 'create_transport': {
            if (!ws.user || !ws.roomId) {
                ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }))
                return
            }
            const room = rooms.get(ws.roomId)
            if (!room) {
                ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }))
                return
            }

            const { direction } = msg
            const peer = room.getPeer(ws.user.id)
            if (!peer) {
                ws.send(JSON.stringify({ type: 'error', message: 'Peer not found' }))
                return
            }

            const transport = await room.router.createWebRtcTransport({
                listenIps: [{ ip: ANNOUNCED_IP, announcedIp: ANNOUNCED_IP }],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
                initialAvailableOutgoingBitrate: 1000000,
                maxSctpMessageSize: 262144,
            })

            if (direction === 'send') {
                peer.sendTransport = transport
            } else {
                peer.recvTransport = transport
            }

            transport.on('dtlsstatechange', (dtlsState) => {
                if (dtlsState === 'failed') transport.close()
            })

            ws.send(JSON.stringify({
                type: 'transport_created',
                direction,
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
                sctpParameters: transport.sctpParameters,
                iceServers: ICE_SERVERS,
            }))
            break
        }

        case 'connect_transport': {
            if (!ws.user || !ws.roomId) {
                ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }))
                return
            }
            const room = rooms.get(ws.roomId)
            if (!room) {
                ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }))
                return
            }

            const peer = room.getPeer(ws.user.id)
            if (!peer) {
                ws.send(JSON.stringify({ type: 'error', message: 'Peer not found' }))
                return
            }

            const { transportId, dtlsParameters, direction } = msg
            const transport = direction === 'send' ? peer.sendTransport : peer.recvTransport
            if (!transport || transport.id !== transportId) {
                ws.send(JSON.stringify({ type: 'error', message: 'Transport not found' }))
                return
            }

            await transport.connect({ dtlsParameters })
            ws.send(JSON.stringify({ type: 'transport_connected', direction }))
            break
        }

        case 'produce': {
            if (!ws.user || !ws.roomId) {
                ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }))
                return
            }
            const room = rooms.get(ws.roomId)
            if (!room) {
                ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }))
                return
            }

            const peer = room.getPeer(ws.user.id)
            if (!peer || !peer.sendTransport) {
                ws.send(JSON.stringify({ type: 'error', message: 'Send transport not ready' }))
                return
            }

            const { kind, rtpParameters, appData } = msg
            const producer = await peer.sendTransport.produce({ kind, rtpParameters, appData })

            peer.producers.set(producer.id, producer)
            room.notifyPeers('new_producer', {
                peerId: ws.user.id,
                producerId: producer.id,
                kind,
                appData: producer.appData,
            }, ws.user.id)

            producer.on('transportclose', () => {
                peer.producers.delete(producer.id)
            })

            ws.send(JSON.stringify({
                type: 'produced',
                id: producer.id,
                kind,
            }))
            break
        }

        case 'consume': {
            if (!ws.user || !ws.roomId) {
                ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }))
                return
            }
            const room = rooms.get(ws.roomId)
            if (!room) {
                ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }))
                return
            }

            const peer = room.getPeer(ws.user.id)
            if (!peer || !peer.recvTransport) {
                ws.send(JSON.stringify({ type: 'error', message: 'Recv transport not ready' }))
                return
            }

            const { producerId, rtpCapabilities } = msg

            if (!room.router.canConsume({ producerId, rtpCapabilities })) {
                ws.send(JSON.stringify({ type: 'error', message: 'Cannot consume' }))
                return
            }

            const consumer = await peer.recvTransport.consume({
                producerId,
                rtpCapabilities,
                paused: true,
            })

            peer.consumers.set(consumer.id, consumer)

            consumer.on('transportclose', () => {
                peer.consumers.delete(consumer.id)
            })
            consumer.on('producerclose', () => {
                peer.consumers.delete(consumer.id)
                ws.send(JSON.stringify({
                    type: 'producer_closed',
                    producerId,
                }))
            })

            ws.send(JSON.stringify({
                type: 'consumed',
                id: consumer.id,
                producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
                consumerType: consumer.type,
                producerPaused: consumer.producerPaused,
            }))
            break
        }

        case 'resume_consumer': {
            if (!ws.user || !ws.roomId) {
                ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }))
                return
            }
            const room = rooms.get(ws.roomId)
            if (!room) {
                ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }))
                return
            }

            const peer = room.getPeer(ws.user.id)
            if (!peer) {
                ws.send(JSON.stringify({ type: 'error', message: 'Peer not found' }))
                return
            }

            const { consumerId } = msg
            const consumer = peer.consumers.get(consumerId)
            if (!consumer) {
                ws.send(JSON.stringify({ type: 'error', message: 'Consumer not found' }))
                return
            }

            await consumer.resume()
            ws.send(JSON.stringify({ type: 'consumer_resumed', consumerId }))
            break
        }

        default:
            ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }))
    }
}

class Room {
    constructor(id, router) {
        this.id = id
        this.router = router
        this.peers = new Map()
    }

    get peerCount() { return this.peers.size }

    addPeer(userId, ws) {
        const peer = new Peer(userId, ws)
        this.peers.set(userId, peer)
        return peer
    }

    getPeer(userId) {
        return this.peers.get(userId)
    }

    removePeer(userId) {
        const peer = this.peers.get(userId)
        if (peer) {
            for (const producer of peer.producers.values()) {
                producer.close()
            }
            for (const consumer of peer.consumers.values()) {
                consumer.close()
            }
            if (peer.sendTransport) peer.sendTransport.close()
            if (peer.recvTransport) peer.recvTransport.close()
            this.peers.delete(userId)
        }
    }

    getPeerList() {
        return Array.from(this.peers.keys())
    }

    getAllProducers() {
        const list = []
        for (const [peerId, peer] of this.peers) {
            for (const [producerId, producer] of peer.producers) {
                list.push({ peerId, producerId, kind: producer.kind })
            }
        }
        return list
    }

    notifyPeers(type, data, excludeUserId) {
        for (const [userId, peer] of this.peers) {
            if (userId !== excludeUserId && peer.ws.readyState === 1) {
                peer.ws.send(JSON.stringify({ type, ...data }))
            }
        }
    }

    close() {
        for (const userId of this.peers.keys()) {
            this.removePeer(userId)
        }
        this.router.close()
    }
}

class Peer {
    constructor(userId, ws) {
        this.id = userId
        this.ws = ws
        this.sendTransport = null
        this.recvTransport = null
        this.producers = new Map()
        this.consumers = new Map()
    }
}
