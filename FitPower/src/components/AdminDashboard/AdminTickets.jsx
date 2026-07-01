import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { MessageCircle, Search, Send } from 'lucide-react'

export default function AdminTickets() {
    const { showToast } = useToast()
    const [tickets, setTickets] = useState([])
    const [expandedId, setExpandedId] = useState(null)
    const [replyText, setReplyText] = useState('')
    const [severityFilter, setSeverityFilter] = useState('')
    const [search, setSearch] = useState('')

    const fetchTickets = useCallback(() => {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (severityFilter) params.set('severity', severityFilter)
        apiFetch(`/admin/tickets?${params}`)
            .then(d => setTickets(d.tickets || d.data || []))
            .catch(() => showToast('Error loading tickets'))
    }, [search, severityFilter, showToast])

    useEffect(() => { fetchTickets() }, [fetchTickets])

    const handleReply = async (ticketId) => {
        if (!replyText.trim()) return
        try { await apiFetch(`/admin/tickets/${ticketId}/reply`, { method: 'POST', body: JSON.stringify({ message: replyText }) }); showToast('Reply sent'); setReplyText(''); fetchTickets() }
        catch (e) { showToast(e.message || 'Error sending reply') }
    }

    const markResolved = async (ticketId) => {
        try { await apiFetch(`/admin/tickets/${ticketId}`, { method: 'PUT', body: JSON.stringify({ status: 'resolved' }) }); showToast('Ticket resolved'); fetchTickets() }
        catch (e) { showToast(e.message || 'Error') }
    }

    const statusClass = (s) => {
        if (s === 'open') return 'pending'
        if (s === 'in_progress' || s === 'in-progress') return 'active'
        if (s === 'resolved' || s === 'closed') return 'resolved'
        return 'pending'
    }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><MessageCircle size={24} /> Support Tickets</h1>
                <div className="ad-content-actions">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#525252' }} />
                        <input className="ad-content-search" style={{ paddingLeft: 36 }} placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="ad-content-search" style={{ minWidth: 120 }} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
                        <option value="">All Severity</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
            </div>
            <div className="ad-dash-card" style={{ margin: '24px' }}>
                {tickets.map(t => (
                    <div key={t.id} className="ad-ticket-item" style={{ marginBottom: 12 }}>
                        <div onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} style={{ cursor: 'pointer' }}>
                            <div className="ad-ticket-top">
                                <div className="ad-ticket-id">#{t.id} - {t.subject || t.title}</div>
                                <span className="ad-ticket-time">{t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}</span>
                            </div>
                            <div className="ad-ticket-desc">{t.message || t.description || t.desc}</div>
                            <div className="ad-ticket-top" style={{ marginBottom: 0 }}>
                                <div className="ad-ticket-user"><span>{t.userName || t.user || 'Unknown'} · {t.email || ''}</span></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className={'ad-status-badge ad-status-' + (t.severity === 'critical' ? 'cancelled' : t.severity === 'high' ? 'pending' : 'active')}>{t.severity}</span>
                                    <span className={'ad-status-badge ad-status-' + statusClass(t.status)}><span className="ad-status-dot" />{t.status}</span>
                                </div>
                            </div>
                        </div>
                        {expandedId === t.id && (
                            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.05)' }}>
                                {(t.replies || []).map((r, i) => (
                                    <div key={i} style={{ padding: '8px 12px', marginBottom: 8, background: 'rgba(255,255,255,.02)', borderRadius: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{r.adminName || r.userName || 'Admin'}</span>
                                            <span className="ad-time">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                                        </div>
                                        <div style={{ fontSize: 13, color: '#d4d4d4' }}>{r.message || r.text}</div>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                    <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} placeholder="Write a reply..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleReply(t.id) }} />
                                    <button className="ad-btn ad-btn-primary ad-btn-xs" onClick={() => handleReply(t.id)} disabled={!replyText.trim()}><Send size={14} /> Send</button>
                                    {t.status !== 'resolved' && t.status !== 'closed' && (
                                        <button className="ad-btn ad-btn-secondary ad-btn-xs" onClick={() => markResolved(t.id)}>Resolve</button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {tickets.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#737373' }}>No tickets found</div>}
            </div>
        </div>
    )
}
