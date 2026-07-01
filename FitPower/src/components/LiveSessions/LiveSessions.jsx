import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Video, Phone, Plus, X, Search, User } from 'lucide-react'
import VideoCall from '../VideoCall/VideoCall'
import './LiveSessions.css'

export default function LiveSessions({ role }) {
    const { showToast } = useToast()
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeCall, setActiveCall] = useState(null)
    const [showNewModal, setShowNewModal] = useState(false)
    const [clients, setClients] = useState([])
    const [clientSearch, setClientSearch] = useState('')
    const [newTitle, setNewTitle] = useState('')
    const [zoomFallback, setZoomFallback] = useState(null)
    const [callError, setCallError] = useState(false)

    const loadSessions = useCallback(async () => {
        try {
            const data = await apiFetch('/video-sessions')
            setSessions(data)
        } catch { showToast('Error loading sessions') }
        finally { setLoading(false) }
    }, [showToast])

    useEffect(() => { loadSessions() }, [loadSessions])

    async function handleStartCall(sessionId) {
        try {
            await apiFetch(`/video-sessions/${sessionId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'active' }),
            })
            setActiveCall(sessionId)
            loadSessions()
        } catch { showToast('Error starting call') }
    }

    function handleJoinCall(sessionId) {
        setActiveCall(sessionId)
    }

    async function handleEndCall() {
        if (activeCall) {
            try {
                await apiFetch(`/video-sessions/${activeCall}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: 'completed' }),
                })
            } catch { /* ignore */ }
        }
        setActiveCall(null)
        loadSessions()
    }

    async function handleCreateSession(calleeId) {
        if (!newTitle.trim()) {
            showToast('Enter a session title')
            return
        }
        try {
            await apiFetch('/video-sessions', {
                method: 'POST',
                body: JSON.stringify({ calleeId, title: newTitle.trim() }),
            })
            setShowNewModal(false)
            setNewTitle('')
            setClientSearch('')
            showToast('Session created')
            loadSessions()
        } catch { showToast('Error creating session') }
    }

    function openNewModal() {
        setNewTitle(`Session with client`)
        setClientSearch('')
        setShowNewModal(true)
        if (role === 'coach') {
            apiFetch('/clients')
                .then(d => setClients(d?.clients || []))
                .catch(() => showToast('Error loading clients'))
        }
    }

    const filteredClients = (clients || []).filter(c => {
        if (!clientSearch.trim()) return true
        const s = clientSearch.toLowerCase()
        const name = (c.name || '').toLowerCase()
        return name.includes(s) || (c.email || '').toLowerCase().includes(s)
    })

    function statusLabel(status) {
        switch (status) {
            case 'pending': case 'scheduled': return 'Pending'
            case 'active': return 'Active'
            case 'completed': return 'Completed'
            case 'cancelled': return 'Cancelled'
            default: return status
        }
    }

    function otherName(session) {
        if (role === 'coach') return session.calleeName
        return session.callerName
    }

    function sessionTime(session) {
        const d = new Date(session.createdAt)
        const now = new Date()
        const diff = Math.floor((now - d) / 60000)
        if (diff < 1) return 'Just now'
        if (diff < 60) return `${diff}m ago`
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
        return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
    }

    if (loading) {
        return <div className="ls-container"><div className="ls-loading"><div className="ls-spinner" /></div></div>
    }

    if (activeCall) {
        if (callError && zoomFallback) {
            return (
                <div className="ls-container">
                    <div className="ls-call-error">
                        <p>Video call failed</p>
                        <a href={zoomFallback} target="_blank" rel="noopener noreferrer" className="ls-zoom-btn">Unirse vía Zoom</a>
                        <button className="ls-btn" onClick={() => { setActiveCall(null); setCallError(false); setZoomFallback(null) }}>Go back</button>
                    </div>
                </div>
            )
        }
        return (
            <div className="ls-container">
                <VideoCall
                    roomId={`vs-${activeCall}`}
                    onClose={handleEndCall}
                    onError={(msg) => { setCallError(true); setZoomFallback(`https://zoom.us/j/COACH_MEETING_ID`); showToast(msg) }}
                />
            </div>
        )
    }

    return (
        <div className="ls-container">
            <div className="ls-header">
                <div className="ls-header-info">
                    <Video size={20} />
                    <span>Live Sessions</span>
                    {sessions.length > 0 && <span className="ls-count">{sessions.length}</span>}
                </div>
                {role === 'coach' && (
                    <button className="ls-new-btn" onClick={openNewModal} title="New session">
                        <Plus size={20} />
                    </button>
                )}
            </div>

            <div className="ls-body">
                {sessions.length === 0 ? (
                    <div className="ls-empty">
                        <Phone size={48} />
                        <p>No video sessions yet</p>
                        {role === 'coach' && (
                            <button className="ls-btn" onClick={openNewModal}>Start a session</button>
                        )}
                    </div>
                ) : (
                    sessions.map(s => (
                        <div key={s.id} className={`ls-session ls-status-${s.status}`}>
                            <div className="ls-session-avatar">
                                <User size={22} />
                            </div>
                            <div className="ls-session-info">
                                <div className="ls-session-top">
                                    <span className="ls-session-name">{otherName(s)}</span>
                                    <span className={`ls-session-badge ls-badge-${s.status}`}>
                                        {statusLabel(s.status)}
                                    </span>
                                </div>
                                <div className="ls-session-meta">
                                    <span className="ls-session-title">{s.title}</span>
                                    <span className="ls-session-time">{sessionTime(s)}</span>
                                </div>
                            </div>
                            <div className="ls-session-actions">
                                {(role === 'coach' && (s.status === 'pending' || s.status === 'scheduled')) && (
                                    <button className="ls-call-btn" onClick={() => handleStartCall(s.id)} title="Start call">
                                        <Phone size={18} />
                                    </button>
                                )}
                                {role === 'coach' && s.status === 'active' && (
                                    <button className="ls-call-btn ls-call-active" onClick={() => handleJoinCall(s.id)} title="Join call">
                                        <Phone size={18} />
                                    </button>
                                )}
                                {role === 'client' && s.status === 'active' && (
                                    <button className="ls-call-btn ls-call-active" onClick={() => handleJoinCall(s.id)} title="Join call">
                                        <Phone size={18} />
                                    </button>
                                )}
                                {(role === 'client' && (s.status === 'pending' || s.status === 'scheduled')) && (
                                    <span className="ls-waiting-label">Waiting...</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showNewModal && (
                <div className="ls-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNewModal(false) }}>
                    <div className="ls-modal">
                        <div className="ls-modal-header">
                            <h3>New Video Session</h3>
                            <button className="ls-modal-close" onClick={() => setShowNewModal(false)}><X size={18} /></button>
                        </div>
                        <div className="ls-modal-body">
                            <div className="ls-field">
                                <label>Title</label>
                                <input
                                    className="ls-input"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    placeholder="Session title..."
                                />
                            </div>
                            <div className="ls-field">
                                <label>Select client</label>
                                <div className="ls-modal-search">
                                    <Search size={16} />
                                    <input
                                        className="ls-search-input"
                                        placeholder="Search clients..."
                                        value={clientSearch}
                                        onChange={e => setClientSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="ls-client-list">
                                {filteredClients.length === 0 ? (
                                    <p className="ls-empty-text">{clientSearch ? 'No results' : 'No clients available'}</p>
                                ) : (
                                    filteredClients.map(c => (
                                        <div key={c.id} className="ls-client-item" onClick={() => handleCreateSession(c.id)}>
                                            <div className="ls-client-avatar"><User size={16} /></div>
                                            <div>
                                                <div className="ls-client-name">{c.name || 'User'}</div>
                                                <div className="ls-client-email">{c.email || ''}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
