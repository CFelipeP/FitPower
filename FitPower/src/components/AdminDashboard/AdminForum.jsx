import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { MessageCircle, Search, Pin, Lock, Unlock, Trash2 } from 'lucide-react'

export default function AdminForum() {
    const { showToast } = useToast()
    const [topics, setTopics] = useState([])
    const [search, setSearch] = useState('')

    const fetchTopics = useCallback(() => {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        apiFetch(`/admin/forum/topics?${params}`)
            .then(d => setTopics(d.topics || d.data || []))
            .catch(() => showToast('Error loading topics'))
    }, [search, showToast])

    useEffect(() => { fetchTopics() }, [fetchTopics])

    const togglePin = async (id, isPinned) => {
        try { await apiFetch(`/admin/forum/topics/${id}/pin`, { method: 'PUT', body: JSON.stringify({ is_pinned: !isPinned }) }); showToast(isPinned ? 'Unpinned' : 'Pinned'); fetchTopics() }
        catch (e) { showToast(e.message || 'Error') }
    }

    const toggleLock = async (id, isLocked) => {
        try { await apiFetch(`/admin/forum/topics/${id}/lock`, { method: 'PUT', body: JSON.stringify({ is_locked: !isLocked }) }); showToast(isLocked ? 'Unlocked' : 'Locked'); fetchTopics() }
        catch (e) { showToast(e.message || 'Error') }
    }

    const deleteTopic = async (id) => {
        if (!confirm('Delete this topic?')) return
        try { await apiFetch(`/admin/forum/topics/${id}`, { method: 'DELETE' }); showToast('Topic deleted'); fetchTopics() }
        catch (e) { showToast(e.message || 'Error') }
    }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><MessageCircle size={24} /> Forum Moderation</h1>
                <div className="ad-content-actions">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#525252' }} />
                        <input className="ad-content-search" style={{ paddingLeft: 36 }} placeholder="Search topics..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="ad-dash-card" style={{ margin: '24px' }}>
                <table className="ad-table">
                    <thead><tr><th>Topic</th><th>Author</th><th>Replies</th><th>Views</th><th>Status</th><th>Last Activity</th><th>Actions</th></tr></thead>
                    <tbody>
                        {topics.map(t => (
                            <tr key={t.id} className="ad-user-row">
                                <td>
                                    <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {t.is_pinned && <Pin size={14} style={{ color: 'var(--power-500)' }} />}
                                        {t.is_locked && <Lock size={14} style={{ color: '#ef4444' }} />}
                                        {t.title}
                                    </span>
                                </td>
                                <td><span className="ad-time">{t.authorName || t.author?.firstName || 'Unknown'}</span></td>
                                <td><span className="ad-time">{t.replyCount || t.replies || 0}</span></td>
                                <td><span className="ad-time">{t.viewCount || t.views || 0}</span></td>
                                <td>
                                    {t.is_locked
                                        ? <span className="ad-status-badge ad-status-cancelled">Locked</span>
                                        : <span className="ad-status-badge ad-status-active">Active</span>}
                                </td>
                                <td><span className="ad-time">{t.lastActivity ? new Date(t.lastActivity).toLocaleDateString() : '-'}</span></td>
                                <td>
                                    <button className="ad-btn ad-btn-secondary ad-btn-xs" style={{ marginRight: 4 }} onClick={() => togglePin(t.id, t.is_pinned)}>
                                        {t.is_pinned ? <Unlock size={14} /> : <Pin size={14} />}
                                    </button>
                                    <button className="ad-btn ad-btn-secondary ad-btn-xs" style={{ marginRight: 4 }} onClick={() => toggleLock(t.id, t.is_locked)}>
                                        {t.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                                    </button>
                                    <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => deleteTopic(t.id)}><Trash2 size={14} /></button>
                                </td>
                            </tr>
                        ))}
                        {topics.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#737373', padding: 32 }}>No topics found</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
