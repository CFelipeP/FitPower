import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { MessageCircle, Send, Mail, MailOpen } from 'lucide-react'

export default function AdminMessages() {
    const { showToast } = useToast()
    const [messages, setMessages] = useState([])
    const [selectedMsg, setSelectedMsg] = useState(null)
    const [replyText, setReplyText] = useState('')

    const fetchMessages = useCallback(() => {
        apiFetch('/admin/messages')
            .then(d => setMessages(d.messages || d.data || []))
            .catch(() => showToast('Error loading messages'))
    }, [showToast])

    useEffect(() => { fetchMessages() }, [fetchMessages])

    const viewMessage = async (msg) => {
        setSelectedMsg(msg)
        if (!msg.read_at) {
            try { await apiFetch(`/admin/messages/${msg.id}`, { method: 'PUT', body: JSON.stringify({}) }); fetchMessages() }
            catch { /* ignore */ }
        }
    }

    const handleReply = async () => {
        if (!replyText.trim() || !selectedMsg) return
        try { await apiFetch(`/admin/messages/${selectedMsg.id}/reply`, { method: 'POST', body: JSON.stringify({ message: replyText }) }); showToast('Reply sent'); setReplyText(''); fetchMessages() }
        catch (e) { showToast(e.message || 'Error') }
    }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><MessageCircle size={24} /> Contact Messages</h1>
            </div>
            <div className="ad-section-grid ad-section-grid-2" style={{ padding: '24px' }}>
                <div className="ad-dash-card" style={{ margin: 0 }}>
                    {messages.map(msg => (
                        <div key={msg.id} className="ad-prog-item" style={{ borderBottom: '1px solid rgba(255,255,255,.05)', padding: '12px 0', cursor: 'pointer', opacity: msg.read_at ? 0.6 : 1 }} onClick={() => viewMessage(msg)}>
                            <div style={{ marginRight: 8, color: msg.read_at ? '#525252' : 'var(--power-500)' }}>
                                {msg.read_at ? <MailOpen size={16} /> : <Mail size={16} />}
                            </div>
                            <div className="ad-prog-info" style={{ flex: 1 }}>
                                <div className="ad-prog-name">{msg.name || msg.senderName || 'Unknown'}</div>
                                <div className="ad-prog-enroll">{msg.subject} · {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</div>
                            </div>
                        </div>
                    ))}
                    {messages.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#737373' }}>No messages</div>}
                </div>
                <div className="ad-dash-card" style={{ margin: 0 }}>
                    {selectedMsg ? (
                        <>
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{selectedMsg.name || selectedMsg.senderName}</div>
                                <div style={{ color: '#737373', fontSize: 13 }}>{selectedMsg.email} · {selectedMsg.createdAt ? new Date(selectedMsg.createdAt).toLocaleString() : ''}</div>
                                <div style={{ color: '#a3a3a3', fontSize: 14, marginTop: 4 }}>{selectedMsg.subject}</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,.02)', borderRadius: 8, padding: 16, marginBottom: 16, color: '#d4d4d4', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                {selectedMsg.message || selectedMsg.content}
                            </div>
                            {(selectedMsg.replies || []).map((r, i) => (
                                <div key={i} style={{ padding: '8px 12px', marginBottom: 8, background: 'rgba(255,214,0,.05)', borderRadius: 8, fontSize: 13 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Admin · {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                                    <div style={{ color: '#d4d4d4' }}>{r.message || r.text}</div>
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} placeholder="Write a reply..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleReply() }} />
                                <button className="ad-btn ad-btn-primary ad-btn-xs" onClick={handleReply} disabled={!replyText.trim()}><Send size={14} /> Send</button>
                            </div>
                        </>
                    ) : (
                        <div style={{ padding: 24, textAlign: 'center', color: '#737373' }}>Select a message to view</div>
                    )}
                </div>
            </div>
        </div>
    )
}
