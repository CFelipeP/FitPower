import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { Dumbbell, Plus, X, Edit2, Trash2 } from 'lucide-react'

const emptyForm = { name: '', description: '', category: '', muscle_group: '', equipment: '', video_url: '', difficulty: 'beginner' }

export default function AdminExercises() {
    const { showToast } = useToast()
    const [exercises, setExercises] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ ...emptyForm })

    useEffect(() => {
        apiFetch('/exercises').then(d => setExercises(d.exercises || d.data || [])).catch(() => {})
    }, [])

    const openCreate = () => { setEditId(null); setForm({ ...emptyForm }); setModalOpen(true) }

    const openEdit = (ex) => {
        setEditId(ex.id)
        setForm({ name: ex.name, description: ex.description || '', category: ex.category || '', muscle_group: ex.muscle_group || '', equipment: ex.equipment || '', video_url: ex.video_url || '', difficulty: ex.difficulty || 'beginner' })
        setModalOpen(true)
    }

    const handleSave = async () => {
        if (!form.name) { showToast('Name is required'); return }
        try {
            if (editId) { await apiFetch(`/exercises/${editId}`, { method: 'PUT', body: JSON.stringify(form) }); showToast('Exercise updated') }
            else { await apiFetch('/exercises', { method: 'POST', body: JSON.stringify(form) }); showToast('Exercise created') }
            setModalOpen(false); apiFetch('/exercises').then(d => setExercises(d.exercises || d.data || [])).catch(() => {})
        } catch (e) { showToast(e.message || 'Error') }
    }

    const deleteExercise = async (id) => {
        if (!confirm('Delete this exercise?')) return
        try { await apiFetch(`/exercises/${id}`, { method: 'DELETE' }); showToast('Exercise deleted'); apiFetch('/exercises').then(d => setExercises(d.exercises || d.data || [])).catch(() => {}) }
        catch (e) { showToast(e.message || 'Error') }
    }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><Dumbbell size={24} /> Exercise Library</h1>
                <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={openCreate}><Plus size={16} /> Add Exercise</button>
            </div>
            <div className="ad-dash-card" style={{ margin: '24px' }}>
                <table className="ad-table">
                    <thead><tr><th>Name</th><th>Category</th><th>Muscle Group</th><th>Equipment</th><th>Difficulty</th><th>Actions</th></tr></thead>
                    <tbody>
                        {exercises.map(ex => (
                            <tr key={ex.id} className="ad-user-row">
                                <td><span style={{ fontWeight: 500 }}>{ex.name}</span></td>
                                <td><span className="ad-time">{ex.category || '-'}</span></td>
                                <td><span className="ad-time">{ex.muscle_group || '-'}</span></td>
                                <td><span className="ad-time">{ex.equipment || '-'}</span></td>
                                <td><span className={'ad-status-badge ad-status-' + (ex.difficulty === 'advanced' ? 'cancelled' : ex.difficulty === 'intermediate' ? 'pending' : 'active')}>{ex.difficulty}</span></td>
                                <td>
                                    <button className="ad-btn ad-btn-secondary ad-btn-xs" style={{ marginRight: 4 }} onClick={() => openEdit(ex)}><Edit2 size={14} /></button>
                                    <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => deleteExercise(ex.id)}><Trash2 size={14} /></button>
                                </td>
                            </tr>
                        ))}
                        {exercises.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#737373', padding: 32 }}>No exercises found</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className={'ad-modal-overlay' + (modalOpen ? ' ad-modal-open' : '')} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
                <div className="ad-modal-content">
                    <div className="ad-modal-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <h3 className="ad-modal-title">{editId ? 'Edit Exercise' : 'Add Exercise'}</h3>
                        <button className="ad-modal-close" onClick={() => setModalOpen(false)}><X /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} placeholder="Exercise name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        <textarea className="ad-content-search" style={{ width: '100%', minWidth: 'unset', minHeight: 80, resize: 'vertical' }} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} placeholder="Muscle group" value={form.muscle_group} onChange={e => setForm({ ...form, muscle_group: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} placeholder="Equipment" value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })} />
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} placeholder="Video URL" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} />
                        </div>
                        <select className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                            <button className="ad-btn ad-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="ad-btn ad-btn-primary" onClick={handleSave}>{editId ? 'Update' : 'Create'} Exercise</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
