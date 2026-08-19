import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { swalError } from '../../lib/alerts'
import { MessageCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import './ClientTickets.css'

const CATEGORIES = [
    { value: 'billing', label: 'Billing / Payments' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'coach', label: 'Coach' },
    { value: 'account', label: 'Account' },
    { value: 'other', label: 'Other' },
]

const STATUS_LABELS = {
    open: 'Open',
    in_progress: 'In Progress',
    critical: 'Critical',
    resolved: 'Resolved',
    closed: 'Closed',
}

export default function ClientTickets() {
    const { showToast } = useToast()
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(null)
    const [formOpen, setFormOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [replyText, setReplyText] = useState({})
    const [replySending, setReplySending] = useState(false)
    const [form, setForm] = useState({ category: 'billing', subject: '', message: '' })

    const fetchTickets = () => {
        apiFetch('/tickets')
            .then(data => setTickets(Array.isArray(data) ? data : []))
            .catch(() => swalError('Error loading your tickets'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchTickets() }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.subject.trim() || !form.message.trim()) {
            swalError('Please fill in the subject and description')
            return
        }
        setSubmitting(true)
        try {
            await apiFetch('/tickets', {
                method: 'POST',
                body: JSON.stringify(form),
            })
            showToast('Ticket created. Support will get back to you.')
            setForm({ category: 'billing', subject: '', message: '' })
            setFormOpen(false)
            fetchTickets()
        } catch (err) {
            swalError(err.message || 'Could not create the ticket. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

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
            swalError(err.message || 'Could not send the reply. Please try again.')
        } finally {
            setReplySending(false)
        }
    }

    return (
        <div className="ct-wrap">
            <div className="ct-header">
                <div>
                    <h1 className="ct-title"><MessageCircle size={22} /> Support</h1>
                    <p className="ct-subtitle">Having trouble? Create a ticket and we will help you.</p>
                </div>
                <button className="ct-btn ct-btn-primary" onClick={() => setFormOpen(o => !o)}>
                    <Plus size={16} /> New Ticket
                </button>
            </div>

            {formOpen && (
                <form className="ct-form" onSubmit={handleSubmit}>
                    <div className="ct-form-row">
                        <label className="ct-label">Category</label>
                        <select
                            className="ct-input"
                            value={form.category}
                            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        >
                            {CATEGORIES.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="ct-form-row">
                        <label className="ct-label">Subject</label>
                        <input
                            className="ct-input"
                            placeholder="Brief summary of your issue"
                            value={form.subject}
                            maxLength={255}
                            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        />
                    </div>
                    <div className="ct-form-row">
                        <label className="ct-label">Description</label>
                        <textarea
                            className="ct-input ct-textarea"
                            placeholder="Tell us what happened and what you need."
                            value={form.message}
                            maxLength={10000}
                            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        />
                    </div>
                    <div className="ct-form-actions">
                        <button type="button" className="ct-btn" onClick={() => setFormOpen(false)}>Cancel</button>
                        <button type="submit" className="ct-btn ct-btn-primary" disabled={submitting}>
                            {submitting ? 'Sending...' : 'Submit Ticket'}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="ct-empty">Loading your tickets...</div>
            ) : tickets.length === 0 ? (
                <div className="ct-empty">
                    <MessageCircle size={32} className="ct-empty-icon" />
                    <p className="ct-empty-title">No tickets yet</p>
                    <p className="ct-empty-text">
                        If something is not working or you have a billing question, create a ticket and we will help you.
                    </p>
                    <button className="ct-btn ct-btn-primary" onClick={() => setFormOpen(true)}>
                        <Plus size={16} /> Create your first ticket
                    </button>
                </div>
            ) : (
                <div className="ct-list">
                    {tickets.map(t => (
                        <div key={t.id} className="ct-card">
                            <button
                                className="ct-card-header"
                                onClick={() => setExpanded(e => (e === t.id ? null : t.id))}
                            >
                                <div className="ct-card-info">
                                    <div className="ct-card-title-row">
                                        <span className="ct-card-subject">{t.subject}</span>
                                        <span className={`ct-badge ct-cat-${t.category || 'other'}`}>
                                            {(CATEGORIES.find(c => c.value === (t.category || 'other')) || {}).label || 'Other'}
                                        </span>
                                    </div>
                                    <div className="ct-card-meta">
                                        <span className={`ct-badge ct-status-${t.severity}`}>{STATUS_LABELS[t.severity] || t.severity}</span>
                                        <span className="ct-card-date">Created {new Date(t.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {expanded === t.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>

                            {expanded === t.id && (
                                <div className="ct-card-body">
                                    <p className="ct-message">{t.message}</p>

                                    <div className="ct-replies">
                                        {(t.replies || []).map(r => (
                                            <div key={r.id} className={`ct-reply ${r.isAdmin ? 'ct-reply-admin' : 'ct-reply-own'}`}>
                                                <div className="ct-reply-meta">
                                                    <span className="ct-reply-author">{r.isAdmin ? 'Support' : 'You'}</span>
                                                    <span className="ct-reply-date">{new Date(r.createdAt).toLocaleString()}</span>
                                                </div>
                                                <p className="ct-reply-text">{r.message}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {t.severity !== 'closed' && t.severity !== 'resolved' && (
                                        <div className="ct-reply-form">
                                            <textarea
                                                className="ct-input ct-textarea"
                                                placeholder="Write a reply..."
                                                value={replyText[t.id] || ''}
                                                onChange={e => setReplyText(p => ({ ...p, [t.id]: e.target.value }))}
                                            />
                                            <button
                                                className="ct-btn ct-btn-primary"
                                                disabled={replySending || !(replyText[t.id] || '').trim()}
                                                onClick={() => handleReply(t.id)}
                                            >
                                                {replySending ? 'Sending...' : 'Send Reply'}
                                            </button>
                                        </div>
                                    )}
                                    {t.severity === 'closed' && (
                                        <p className="ct-closed-note">This ticket is closed. If you still need help, create a new ticket.</p>
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
