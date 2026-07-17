import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { MessageCircle, Send, ChevronLeft, Plus, X, CheckCheck, Search } from 'lucide-react'
import './ChatMessenger.css'

const WS_URL = import.meta.env.VITE_WS_URL || (() => {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${location.hostname}:5180`
})()
const POLL_INTERVAL = 15000
const EMOJIS = ['😀','😎','🔥','💪','❤️','👍','🎉','💯','😂','😍','🙌','👏','✨','🤝','💀','👀','😅','🥹','😤','🙏','💥','⚡','🔥','💪','🏆','🥇','🎯','💡','🎵','🎶','💜','🌟','⭐','🌈','🫶']
const COLORS = ['#f97316','#8b5cf6','#06b6d4','#ec4899','#22c55e','#eab308','#3b82f6','#a855f7']

function getCurrentUserId() {
    try {
        const token = localStorage.getItem('token')
        if (!token) return null
        const payload = JSON.parse(atob(token.split('.')[1]))
        return Number(payload.sub)
    } catch { return null }
}

function hashColor(name) {
    let h = 0
    for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
    return COLORS[Math.abs(h) % COLORS.length]
}

function getInitials(name) {
    if (!name) return '?'
    return name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2)
}

function parseLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = []; let last = 0, match
    while ((match = urlRegex.exec(text)) !== null) {
        if (match.index > last) parts.push({ t: 'text', v: text.slice(last, match.index) })
        parts.push({ t: 'link', v: match[0] })
        last = match.index + match[0].length
    }
    if (last < text.length) parts.push({ t: 'text', v: text.slice(last) })
    return parts.length ? parts : [{ t: 'text', v: text }]
}

function isImageUrl(url) {
    return /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url)
}

const SCROLL_KEY = 'cm_scroll'

export default function ChatMessenger() {
    const { showToast } = useToast()
    const currentUserId = getCurrentUserId()
    const [conversations, setConversations] = useState([])
    const [activeConv, setActiveConv] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMsg, setNewMsg] = useState('')
    const [loading, setLoading] = useState(true)
    const [showNewModal, setShowNewModal] = useState(false)
    const [users, setUsers] = useState([])
    const [usersLoading, setUsersLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [showEmoji, setShowEmoji] = useState(false)
    const [convSearch, setConvSearch] = useState('')
    const [userSearch, setUserSearch] = useState('')
    const [wsConnected, setWsConnected] = useState(false)
    const [typingUsers, setTypingUsers] = useState({})
    const [stickToBottom, setStickToBottom] = useState(true)
    const stickToBottomRef = useRef(true)
    useEffect(() => { stickToBottomRef.current = stickToBottom }, [stickToBottom])
    const wsRef = useRef(null)
    const typingTimerRef = useRef(null)
    const msgEndRef = useRef(null)
    const msgContainerRef = useRef(null)
    const inputRef = useRef(null)
    const emojiRef = useRef(null)
    const pollRef = useRef(null)
    const sendingRef = useRef(false)

    const loadConversations = useCallback(async () => {
        try {
            const data = await apiFetch('/conversations')
            setConversations(data)
        } catch { showToast('Error loading conversations') }
        finally { setLoading(false) }
    }, [showToast])

    const loadMessages = useCallback(async (convId, silent = false) => {
        try {
            const data = await apiFetch(`/messages/${convId}`)
            const prev = msgContainerRef.current
            if (silent && prev) {
                const saved = stickToBottomRef.current ? null : prev.scrollTop
                setMessages(prevMessages => {
                    const dataIds = new Set(data.map(m => m.id))
                    const kept = prevMessages.filter(m => !dataIds.has(m.id) && m.id > 0)
                    return [...data, ...kept]
                })
                if (saved !== null) {
                    requestAnimationFrame(() => {
                        if (msgContainerRef.current) {
                            msgContainerRef.current.scrollTop = saved
                        }
                    })
                }
            } else {
                setMessages(data)
            }
            if (!silent) setLoading(false)
        } catch { if (!silent) { showToast('Error loading messages'); setLoading(false) } }
    }, [showToast])

    function stopPolling() {
        if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
        }
    }

    const startPolling = useCallback((convId) => {
        stopPolling()
        pollRef.current = setInterval(() => {
            loadMessages(convId, true)
        }, POLL_INTERVAL)
    }, [loadMessages])

    const handleWSMessage = useCallback((data) => {
        switch (data.type) {
            case 'auth_ok':
                setWsConnected(true)
                if (activeConv) {
                    wsRef.current?.send(JSON.stringify({ type: 'subscribe', conversationId: activeConv.id }))
                }
                break

            case 'new_message':
                setMessages(prev => {
                    if (prev.some(m => m.id === data.id)) return prev
                    const tempIdx = prev.findIndex(m => m.id < 0)
                    if (tempIdx !== -1) {
                        const updated = [...prev]
                        updated[tempIdx] = { id: data.id, senderId: data.senderId, content: data.content, createdAt: data.createdAt }
                        return updated
                    }
                    return [...prev, {
                        id: data.id,
                        senderId: data.senderId,
                        content: data.content,
                        createdAt: data.createdAt,
                    }]
                })
                if (data.senderId !== currentUserId && document.hidden) {
                    try {
                        const n = new Notification('FitPower', {
                            body: data.content,
                            icon: '/favicon.svg',
                        })
                        setTimeout(() => n.close(), 5000)
                    } catch { /* notifications not supported */ }
                }
                loadConversations()
                break

            case 'typing':
                if (Number(data.userId) === currentUserId) break
                setTypingUsers(prev => ({
                    ...prev,
                    [data.conversationId]: data.isTyping ? data.userId : null,
                }))
                break

            case 'error':
                setMessages(prev => {
                    const cleaned = prev.filter(m => m.id > 0)
                    return cleaned.length === prev.length ? prev : cleaned
                })
                showToast(data.message || 'Error en el chat')
                break

            case 'subscribed':
                break
        }
    }, [activeConv, currentUserId, loadConversations, showToast])

    const connectWS = useCallback(() => {
        const token = localStorage.getItem('token')
        if (!token) return
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'auth', token }))
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                handleWSMessage(data)
            } catch { /* ignore invalid messages */ }
        }

        ws.onclose = () => {
            setWsConnected(false)
        }

        ws.onerror = () => { ws.close() }
    }, [handleWSMessage])

    useEffect(() => { loadConversations() }, [loadConversations])
    useEffect(() => {
        if (activeConv) {
            loadMessages(activeConv.id)
            startPolling(activeConv.id)
        } else {
            stopPolling()
        }
        return () => stopPolling()
    }, [activeConv, loadMessages, startPolling])
    useEffect(() => {
        if (messages.length && stickToBottom) {
            msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            sessionStorage.setItem(SCROLL_KEY, '')
        } else if (messages.length && stickToBottom === false) {
            const saved = sessionStorage.getItem(SCROLL_KEY)
            if (saved && msgContainerRef.current) {
                msgContainerRef.current.scrollTop = Number(saved)
            }
        }
    }, [messages, stickToBottom])
    useEffect(() => {
        function handleClick(e) {
            if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    useEffect(() => {
        connectWS()
        const timer = setInterval(() => {
            if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
                connectWS()
            }
        }, 5000)
        return () => {
            clearInterval(timer)
            if (wsRef.current) wsRef.current.close()
        }
    }, [connectWS])

    useEffect(() => {
        if (!activeConv || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
        wsRef.current.send(JSON.stringify({ type: 'subscribe', conversationId: activeConv.id }))
    }, [activeConv, wsConnected])

    function handleScroll() {
        if (!msgContainerRef.current) return
        const { scrollTop, scrollHeight, clientHeight } = msgContainerRef.current
        const atBottom = scrollHeight - scrollTop - clientHeight < 60
        setStickToBottom(atBottom)
        if (!atBottom) {
            sessionStorage.setItem(SCROLL_KEY, String(scrollTop))
        }
    }

    async function handleSend() {
        if (!newMsg.trim() || !activeConv || sendingRef.current) return
        const content = newMsg.trim()
        const tempId = -Date.now()
        sendingRef.current = true
        setNewMsg('')
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'
        }
        setSending(true)
        const optimisticMsg = {
            id: tempId,
            senderId: currentUserId,
            content,
            createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, optimisticMsg])
        setStickToBottom(true)
        if (wsRef.current?.readyState === WebSocket.OPEN && wsConnected) {
            const token = localStorage.getItem('token')
            try {
                wsRef.current.send(JSON.stringify({
                    type: 'message',
                    conversationId: activeConv.id,
                    content,
                    token,
                }))
            } catch {
                setMessages(prev => prev.filter(m => m.id !== tempId))
                setNewMsg(content)
                showToast('Error sending message')
            }
            setSending(false)
            sendingRef.current = false
        } else {
            try {
                await apiFetch(`/messages/${activeConv.id}`, {
                    method: 'POST',
                    body: JSON.stringify({ content }),
                })
                await loadMessages(activeConv.id)
                loadConversations()
            } catch {
                showToast('Error sending message')
                setMessages(prev => prev.filter(m => m.id !== tempId))
                setNewMsg(content)
            } finally {
                setSending(false)
                sendingRef.current = false
            }
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    function handleInputChange(e) {
        setNewMsg(e.target.value)
        const el = inputRef.current
        if (el) {
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 120) + 'px'
        }
        if (wsRef.current?.readyState === WebSocket.OPEN && activeConv) {
            wsRef.current.send(JSON.stringify({
                type: 'typing',
                conversationId: activeConv.id,
                isTyping: true,
            }))
            clearTimeout(typingTimerRef.current)
            typingTimerRef.current = setTimeout(() => {
                wsRef.current?.send(JSON.stringify({
                    type: 'typing',
                    conversationId: activeConv.id,
                    isTyping: false,
                }))
            }, 2000)
        }
    }

    function selectConversation(conv) { setConvSearch(''); setStickToBottom(true); setActiveConv(conv) }
    const handleBack = useCallback(() => { setActiveConv(null); setMessages([]); setTypingUsers({}); stopPolling() }, [])

    function handleNewChat() {
        setShowNewModal(true); setUserSearch('')
        setUsersLoading(true)
        apiFetch('/users/contacts')
            .then(data => setUsers(data || []))
            .catch(() => showToast('Error loading contacts'))
            .finally(() => setUsersLoading(false))
    }

    function startConversation(userId) {
        apiFetch('/conversations', {
            method: 'POST',
            body: JSON.stringify({ userId }),
        })
            .then(data => { setShowNewModal(false); setActiveConv(data); loadConversations() })
            .catch(() => showToast('Error creating conversation'))
    }

    function getOtherUserName(conv) { return conv.otherUserName || 'User' }

    function getLastMessageDate(conv) {
        if (!conv.lastMessageAt) return ''
        const d = new Date(conv.lastMessageAt), now = new Date()
        const diff = Math.floor((now - d) / 86400000)
        if (diff === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        if (diff === 1) return 'Yesterday'
        if (diff < 7) return d.toLocaleDateString([], { weekday: 'short' })
        return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
    }

    function formatTime(d) { return d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '' }
    function formatDate(d) {
        if (!d) return ''
        const date = new Date(d), now = new Date()
        const diff = Math.floor((now - date) / 86400000)
        if (diff === 0) return 'Today'
        if (diff === 1) return 'Yesterday'
        return date.toLocaleDateString([], { day: 'numeric', month: 'long' })
    }

    const groupedMessages = useMemo(() => {
        const groups = []
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i]
            const prev = messages[i - 1]
            const sameSender = prev && Number(msg.senderId) === Number(prev.senderId)
            const timeDiff = prev ? new Date(msg.createdAt) - new Date(prev.createdAt) : Infinity
            if (sameSender && timeDiff < 120000) {
                groups[groups.length - 1].msgs.push(msg)
            } else {
                groups.push({ senderId: msg.senderId, msgs: [msg], createdAt: msg.createdAt })
            }
        }
        return groups
    }, [messages])

    const filteredConversations = useMemo(() => {
        if (!convSearch.trim()) return conversations
        const s = convSearch.toLowerCase()
        return conversations.filter(c => getOtherUserName(c).toLowerCase().includes(s))
    }, [conversations, convSearch])

    const filteredUsers = useMemo(() => {
        if (!userSearch.trim()) return users
        const s = userSearch.toLowerCase()
        return users.filter(u => (u.firstName || '').toLowerCase().includes(s) ||
            (u.lastName || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s))
    }, [users, userSearch])

    function addEmoji(e) { setNewMsg(p => p + e); setShowEmoji(false); inputRef.current?.focus() }

    const isLoggedIn = !!currentUserId
    const isTyping = activeConv && typingUsers[activeConv.id]

    const statusText = !isLoggedIn ? 'Disconnected' : wsConnected ? 'Online' : 'Connecting...'
    const statusClass = !isLoggedIn ? '' : wsConnected ? 'online' : ''

    if (loading) {
        return <div className="cm-container"><div className="cm-loading"><div className="cm-spinner" /></div></div>
    }

    return (
        <div className="cm-container">
            {!wsConnected && (
                <div className="cm-ws-banner">Connecting to live chat...</div>
            )}

            <div className={`cm-sidebar ${activeConv ? 'cm-sidebar-hidden' : ''}`}>
                <div className="cm-header">
                    <div className="cm-header-info">
                        <MessageCircle size={20} />
                        <span>Messages</span>
                        {conversations.length > 0 && <span className="cm-header-count">{conversations.length}</span>}
                    </div>
                    <button className="cm-new-btn" onClick={handleNewChat} title="New chat"><Plus size={20} /></button>
                </div>

                {conversations.length > 0 && (
                    <div className="cm-search-bar">
                        <Search size={16} />
                        <input className="cm-search-input" placeholder="Search conversations..." value={convSearch} onChange={e => setConvSearch(e.target.value)} />
                        {convSearch && <button className="cm-search-clear" onClick={() => setConvSearch('')}><X size={14} /></button>}
                    </div>
                )}

                <div className="cm-conv-list">
                    {filteredConversations.length === 0 ? (
                        <div className="cm-empty">
                            {conversations.length === 0 ? (
                                <><MessageCircle size={52} /><p>No conversations</p><button className="cm-btn" onClick={handleNewChat}>Start new chat</button></>
                            ) : (
                                <><Search size={40} /><p>No conversations found</p></>
                            )}
                        </div>
                    ) : (
                        filteredConversations.map(conv => (
                            <div key={conv.id} className={`cm-conv-item ${activeConv?.id === conv.id ? 'cm-conv-active' : ''}`} onClick={() => selectConversation(conv)}>
                                <div className="cm-conv-avatar" style={{ background: hashColor(getOtherUserName(conv)) }}>
                                    {getInitials(getOtherUserName(conv))}
                                </div>
                                <div className="cm-conv-info">
                                    <div className="cm-conv-top">
                                        <span className="cm-conv-name">{getOtherUserName(conv)}</span>
                                        <span className="cm-conv-time">{getLastMessageDate(conv)}</span>
                                    </div>
                                    <div className="cm-conv-last">{conv.lastMessage || 'No messages'}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className={`cm-chat-panel ${!activeConv ? 'cm-chat-empty' : ''}`}>
                {activeConv ? (
                    <>
                        <div className="cm-chat-header">
                            <button className="cm-back-btn cm-back-desktop" onClick={handleBack}><ChevronLeft size={22} /></button>
                            <button className="cm-back-btn cm-back-mobile" onClick={handleBack}><ChevronLeft size={22} /></button>
                            <div className="cm-chat-avatar" style={{ background: hashColor(getOtherUserName(activeConv)) }}>
                                {getInitials(getOtherUserName(activeConv))}
                            </div>
                            <div className="cm-chat-info">
                                <span className="cm-chat-name">{getOtherUserName(activeConv)}</span>
                                <span className="cm-chat-status">
                                    <span className={`cm-status-dot ${statusClass}`} />
                                    {statusText}
                                </span>
                            </div>
                        </div>

                        <div className="cm-messages" ref={msgContainerRef} onScroll={handleScroll}>
                            {groupedMessages.length === 0 ? (
                                <div className="cm-empty-msg">
                                    <MessageCircle size={44} />
                                    <p>No messages yet.<br />Send the first one!</p>
                                </div>
                            ) : (
                                groupedMessages.map((group, gi) => {
                                    const isSent = Number(group.senderId) === currentUserId
                                    const prevGroups = groupedMessages.slice(0, gi)
                                    const prevIdx = prevGroups.reduce((s, g) => s + g.msgs.length, 0) - 1
                                    const prevMsg = prevIdx >= 0 ? messages[prevIdx] : null
                                    const showDate = gi === 0 || formatDate(group.createdAt) !== formatDate(prevMsg?.createdAt)
                                    return (
                                        <div key={`g-${gi}`}>
                                            {showDate && gi > 0 && (
                                                <div className="cm-date-sep"><span>{formatDate(group.createdAt)}</span></div>
                                            )}
                                            <div className={`cm-msg-group ${isSent ? 'cm-group-sent' : 'cm-group-received'}`}>
                                                {!isSent && (
                                                    <div className="cm-group-avatar" style={{ background: hashColor(getOtherUserName(activeConv)) }}>
                                                        {getInitials(getOtherUserName(activeConv))}
                                                    </div>
                                                )}
                                                <div className="cm-group-bubbles">
                                                    {group.msgs.map((msg, mi) => {
                                                        const parts = parseLinks(msg.content)
                                                        return (
                                                            <div key={msg.id} className={`cm-bubble ${isSent ? 'cm-bubble-sent' : 'cm-bubble-rec'}`}>
                                                                {parts.map((part, pi) =>
                                                                    part.t === 'link' ? (
                                                                        isImageUrl(part.v) ? (
                                                                            <a href={part.v} target="_blank" rel="noopener noreferrer" className="cm-img-link">
                                                                                <img src={part.v} alt="" className="cm-msg-img" loading="lazy" />
                                                                            </a>
                                                                        ) : (
                                                                            <a key={pi} href={part.v} target="_blank" rel="noopener noreferrer" className="cm-link">{part.v}</a>
                                                                        )
                                                                    ) : (
                                                                        <span key={pi} className="cm-text">{part.v}</span>
                                                                    )
                                                                )}
                                                                {mi === group.msgs.length - 1 && (
                                                                    <div className="cm-bubble-meta">
                                                                        <span className="cm-bubble-time">{formatTime(msg.createdAt)}</span>
                                                                        {isSent && <CheckCheck size={12} className="cm-read-tick" />}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            {isTyping && (
                                <div className="cm-typing">
                                    <span className="cm-typing-dots"><span>.</span><span>.</span><span>.</span></span>
                                </div>
                            )}
                            <div ref={msgEndRef} />
                        </div>

                        <div className="cm-input-area">
                            <div className="cm-input-wrap" ref={emojiRef}>
                                <button className="cm-emoji-btn" onClick={() => setShowEmoji(!showEmoji)}>😀</button>
                                {showEmoji && (
                                    <div className="cm-emoji-picker">
                                        {EMOJIS.map(e => (
                                            <button key={e} className="cm-emoji-item" onClick={() => addEmoji(e)}>{e}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <textarea
                                ref={inputRef}
                                className="cm-input"
                                placeholder="Type a message..."
                                value={newMsg}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                maxLength={2000}
                            />
                            <button className="cm-send-btn" onClick={handleSend} disabled={!newMsg.trim() || sending}>
                                <Send size={18} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="cm-no-chat">
                        <div className="cm-no-chat-icon">
                            <MessageCircle size={64} />
                        </div>
                        <h2 className="cm-no-chat-title">FitPower Messages</h2>
                        <p className="cm-no-chat-sub">Select a conversation to start chatting</p>
                    </div>
                )}
            </div>

            {showNewModal && (
                <div className="cm-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNewModal(false) }}>
                    <div className="cm-modal">
                        <div className="cm-modal-header">
                            <h3>New Chat</h3>
                            <button className="cm-modal-close" onClick={() => setShowNewModal(false)}><X size={18} /></button>
                        </div>
                        <div className="cm-modal-search">
                            <Search size={16} />
                            <input className="cm-modal-search-input" placeholder="Search by name or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} autoFocus />
                        </div>
                        <div className="cm-modal-body">
                            {usersLoading ? (
                                <div className="cm-loading" style={{ padding: 40 }}><div className="cm-spinner" /></div>
                            ) : filteredUsers.length === 0 ? (
                                <p className="cm-empty-text">{userSearch ? 'No results' : 'No users available'}</p>
                            ) : (
                                filteredUsers.map(user => (
                                    <div key={user.id} className="cm-user-item" onClick={() => startConversation(user.id)}>
                                        <div className="cm-user-avatar" style={{ background: hashColor((user.firstName || '') + ' ' + (user.lastName || '')) }}>
                                            {getInitials((user.firstName || '') + ' ' + (user.lastName || ''))}
                                        </div>
                                        <div>
                                            <div className="cm-user-name">{user.firstName || ''} {user.lastName || ''}</div>
                                            <div className="cm-user-email">{user.email || ''}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
