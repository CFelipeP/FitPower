import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { Flame, Plus, X, Edit2, Trash2 } from 'lucide-react'

const emptyForm = { title: '', description: '', goal_value: '', goal_unit: '', start_date: '', end_date: '', max_participants: '', reward_points: '', is_featured: false }

export default function AdminChallenges() {
    const { showToast } = useToast()
    const [challenges, setChallenges] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ ...emptyForm })

    useEffect(() => {
        apiFetch('/admin/challenges').then(d => setChallenges(d.challenges || d.data || [])).catch(() => {})
    }, [])

    const openCreate = () => { setEditId(null); setForm({ ...emptyForm }); setModalOpen(true) }

    const openEdit = (ch) => {
        setEditId(ch.id)
        setForm({ title: ch.title, description: ch.description || '', goal_value: String(ch.goal_value || ''), goal_unit: ch.goal_unit || '', start_date: ch.start_date ? ch.start_date.slice(0, 10) : '', end_date: ch.end_date ? ch.end_date.slice(0, 10) : '', max_participants: String(ch.max_participants || ''), reward_points: String(ch.reward_points || ''), is_featured: ch.is_featured || false })
        setModalOpen(true)
    }

    const handleSave = async () => {
        if (!form.title) { showToast('Title is required'); return }
        const body = { ...form, goal_value: form.goal_value ? parseFloat(form.goal_value) : null, max_participants: form.max_participants ? parseInt(form.max_participants) : null, reward_points: form.reward_points ? parseInt(form.reward_points) : null }
        try {
            if (editId) { await apiFetch(`/admin/challenges/${editId}`, { method: 'PUT', body: JSON.stringify(body) }); showToast('Challenge updated') }
            else { await apiFetch('/admin/challenges', { method: 'POST', body: JSON.stringify(body) }); showToast('Challenge created') }
            setModalOpen(false); apiFetch('/admin/challenges').then(d => setChallenges(d.challenges || d.data || [])).catch(() => {})
        } catch (e) { showToast(e.message || 'Error') }
    }

    const deleteChallenge = async (id) => {
        if (!confirm('Delete this challenge?')) return
        try { await apiFetch(`/admin/challenges/${id}`, { method: 'DELETE' }); showToast('Challenge deleted'); apiFetch('/admin/challenges').then(d => setChallenges(d.challenges || d.data || [])).catch(() => {}) }
        catch (e) { showToast(e.message || 'Error') }
    }

    const statusClass = (ch) => {
        if (ch.status === 'active' || ch.status === 'published') return 'active'
        if (ch.status === 'completed' || ch.status === 'ended') return 'resolved'
        if (ch.status === 'cancelled') return 'cancelled'
        return 'pending'
    }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><Flame size={24} /> Challenges</h1>
                <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={openCreate}><Plus size={16} /> Add Challenge</button>
            </div>
            <div className="ad-dash-card" style={{ margin: '24px' }}>
                <table className="ad-table">
                    <thead><tr><th>Title</th><th>Goal</th><th>Participants</th><th>Start</th><th>End</th><th>Status</th><th>Reward</th><th>Actions</th></tr></thead>
                    <tbody>
                        {challenges.map(ch => (
                            <tr key={ch.id} className="ad-user-row">
                                <td><span style={{ fontWeight: 500 }}>{ch.title} {ch.is_featured ? <span className="ad-status-badge ad-status-active" style={{ fontSize: 10 }}>Featured</span> : ''}</span></td>
                                <td><span className="ad-time">{ch.goal_value ? ch.goal_value + ' ' + ch.goal_unit : '-'}</span></td>
                                <td><span className="ad-time">{ch.participants || ch.participantCount || 0}</span></td>
                                <td><span className="ad-time">{ch.start_date ? new Date(ch.start_date).toLocaleDateString() : '-'}</span></td>
                                <td><span className="ad-time">{ch.end_date ? new Date(ch.end_date).toLocaleDateString() : '-'}</span></td>
                                <td><span className={'ad-status-badge ad-status-' + statusClass(ch)}><span className="ad-status-dot" />{ch.status || 'draft'}</span></td>
                                <td><span className="ad-time">{ch.reward_points ? ch.reward_points + ' pts' : '-'}</span></td>
                                <td>
                                    <button className="ad-btn ad-btn-secondary ad-btn-xs" style={{ marginRight: 4 }} onClick={() => openEdit(ch)}><Edit2 size={14} /></button>
                                    <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => deleteChallenge(ch.id)}><Trash2 size={14} /></button>
                                </td>
                            </tr>
                        ))}
                        {challenges.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#737373', padding: 32 }}>No challenges found</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className={'ad-modal-overlay' + (modalOpen ? ' ad-modal-open' : '')} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
                <div className="ad-modal-content">
                    <div className="ad-modal-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <h3 className="ad-modal-title">{editId ? 'Edit Challenge' : 'Add Challenge'}</h3>
                        <button className="ad-modal-close" onClick={() => setModalOpen(false)}><X /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        <textarea className="ad-content-search" style={{ width: '100%', minWidth: 'unset', minHeight: 80, resize: 'vertical' }} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} type="number" placeholder="Goal value" value={form.goal_value} onChange={e => setForm({ ...form, goal_value: e.target.value })} />
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} placeholder="Goal unit" value={form.goal_unit} onChange={e => setForm({ ...form, goal_unit: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} type="date" placeholder="Start date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} type="date" placeholder="End date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} type="number" placeholder="Max participants" value={form.max_participants} onChange={e => setForm({ ...form, max_participants: e.target.value })} />
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} type="number" placeholder="Reward points" value={form.reward_points} onChange={e => setForm({ ...form, reward_points: e.target.value })} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a3a3a3', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} style={{ accentColor: 'var(--power-500)' }} />
                            Featured challenge
                        </label>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                            <button className="ad-btn ad-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="ad-btn ad-btn-primary" onClick={handleSave}>{editId ? 'Update' : 'Create'} Challenge</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
