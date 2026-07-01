import { useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { Bell, Send } from 'lucide-react'

export default function AdminNotifications() {
    const { showToast } = useToast()
    const [form, setForm] = useState({ title: '', message: '', type: 'info', link_url: '', target_role: '' })
    const [sending, setSending] = useState(false)

    const handleSend = async () => {
        if (!form.title || !form.message) { showToast('Title and message required'); return }
        setSending(true)
        try {
            await apiFetch('/admin/notifications/broadcast', { method: 'POST', body: JSON.stringify(form) })
            showToast('Notification sent')
            setForm({ title: '', message: '', type: 'info', link_url: '', target_role: '' })
        } catch (e) { showToast(e.message || 'Error sending notification') }
        finally { setSending(false) }
    }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><Bell size={24} /> Broadcast Notifications</h1>
            </div>
            <div className="ad-dash-card" style={{ margin: '24px', maxWidth: 600 }}>
                <h3 className="ad-section-title-sm" style={{ marginBottom: 24 }}>Send Notification</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <input className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    <textarea className="ad-content-search" style={{ width: '100%', minWidth: 'unset', minHeight: 120, resize: 'vertical' }} placeholder="Message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                    <div style={{ display: 'flex', gap: 12 }}>
                        <select className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="success">Success</option>
                            <option value="error">Error</option>
                        </select>
                        <select className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} value={form.target_role} onChange={e => setForm({ ...form, target_role: e.target.value })}>
                            <option value="">All Users</option>
                            <option value="admin">Admins</option>
                            <option value="coach">Coaches</option>
                            <option value="client">Clients</option>
                        </select>
                    </div>
                    <input className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} placeholder="Link URL (optional)" value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button className="ad-btn ad-btn-primary" onClick={handleSend} disabled={sending}>
                            {sending ? 'Sending...' : <><Send size={16} /> Send Notification</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
