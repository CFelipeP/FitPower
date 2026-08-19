import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { confirmSwal, swalError } from '../../lib/alerts'
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import './CoachTickets.css'

const STATUS_LABELS = {
    open: 'Open',
    in_progress: 'In Progress',
    critical: 'Critical',
    resolved: 'Resolved',
    closed: 'Closed',
}

export default function CoachTickets() {
    const { showToast } = useToast()
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(null)
    const [replyText, setReplyText] = useState({})
    const [replySending, setReplySending] = useState(false)
    const [closing, setClosing] = useState(null)
    const [filter, setFilter] = useState('')

    const fetchTickets = () => {
        const q = filter ? `?status=${filter}` : ''
        apiFetch(`/tickets${q}`)
            .then(data => setTickets(Array.isArray(data) ? data : []))
            .catch(() => swalError('Error loading tickets'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchTickets() }, [filter])

    const handleReply = async (ticketId) => {
        const text = (replyText[ticketId] || '').trim()
        if (!text) return
        setReplySending(true)
        try {
            await apiFetch(`/tickets/${ticketId}/reply`, {
                method: 'POST',
                body: JSON.stringify({ message: text }),
            })
            setReplyText(p => ({ ...p, [ticketId]: '' }))
            showToast('Reply sent')
            fetchTickets()
        } catch (err) {
            swalError(err.message || 'Could not send the reply')
        } finally {
            setReplySending(false)
        }
    }

    const handleClose = async (ticketId) => {
        if (!(await confirmSwal('Close this ticket? The client will be notified.'))) return
        setClosing(ticketId)
        try {
            await apiFetch(`/tickets/${ticketId}`, {
                method: 'PUT',
                body: JSON.stringify({ severity: 'closed' }),
            })
            showToast('Ticket closed')
            fetchTickets()
        } catch (err) {
            swalError(err.message || 'Could not close the ticket')
        } finally {
            setClosing(null)
        }
    }

    return (
        <div className="ckt-wrap">
            <div className="ckt-header">
                <div>
                    <h1 className="ckt-title"><MessageCircle size={22} /> Support Tickets</h1>
                    <p className="ckt-subtitle">Help clients resolve issues. Only you can close tickets.</p>
                </div>
                <select className="ckt-filter" value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="">All statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="critical">Critical</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                </select>
            </div>

            {loading ? (
                <div className="ckt-empty">Loading tickets...</div>
            ) : tickets.length === 0 ? (
                <div className="ckt-empty">
                    <MessageCircle size={32} />
                    <p>No tickets found.</p>
                </div>
            ) : (
                <div className="ckt-list">
                    {tickets.map(t => (
                        <div key={t.id} className="ckt-card">
                            <button
                                className="ckt-card-header"
                                onClick={() => setExpanded(e => (e === t.id ? null : t.id))}
                            >
                                <div className="ckt-card-info">
                                    <div className="ckt-card-title-row">
                                        <span className="ckt-card-subject">#{t.id} — {t.subject}</span>
                                    </div>
                                    <div className="ckt-card-meta">
                                        <span className={`ckt-badge ckt-status-${t.severity}`}>{STATUS_LABELS[t.severity] || t.severity}</span>
                                        <span className="ckt-card-user">{t.userName || 'Client'}</span>
                                        <span className="ckt-card-date">{new Date(t.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {expanded === t.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>

                            {expanded === t.id && (
                                <div className="ckt-card-body">
                                    <p className="ckt-message">{t.message}</p>

                                    <div className="ckt-replies">
                                        {(t.replies || []).map(r => (
                                            <div key={r.id} className={`ckt-reply ${r.isAdmin ? 'ckt-reply-staff' : 'ckt-reply-own'}`}>
                                                <div className="ckt-reply-meta">
                                                    <span className="ckt-reply-author">{r.userName || (r.isAdmin ? 'Support' : 'Client')}</span>
                                                    <span className="ckt-reply-date">{new Date(r.createdAt).toLocaleString()}</span>
                                                </div>
                                                <p className="ckt-reply-text">{r.message}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {t.severity !== 'closed' && (
                                        <>
                                            <div className="ckt-reply-form">
                                                <textarea
                                                    className="ckt-input"
                                                    placeholder="Write a reply to the client..."
                                                    value={replyText[t.id] || ''}
                                                    onChange={e => setReplyText(p => ({ ...p, [t.id]: e.target.value }))}
                                                />
                                                <button
                                                    className="ckt-btn ckt-btn-primary"
                                                    disabled={replySending || !(replyText[t.id] || '').trim()}
                                                    onClick={() => handleReply(t.id)}
                                                >
                                                    {replySending ? 'Sending...' : 'Send Reply'}
                                                </button>
                                            </div>
                                            <div className="ckt-actions">
                                                <button
                                                    className="ckt-btn ckt-btn-close"
                                                    disabled={closing === t.id}
                                                    onClick={() => handleClose(t.id)}
                                                >
                                                    {closing === t.id ? 'Closing...' : 'Close Ticket'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
