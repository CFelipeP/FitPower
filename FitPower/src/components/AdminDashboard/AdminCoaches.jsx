import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { Search, Filter, X, Check, Ban, Trash2, AlertTriangle, Award } from 'lucide-react'

export default function AdminCoaches() {
    const { showToast } = useToast()
    const [coaches, setCoaches] = useState([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [selected, setSelected] = useState([])
    const [coachModalOpen, setCoachModalOpen] = useState(false)
    const [selectedCoach, setSelectedCoach] = useState(null)
    const [confirmAction, setConfirmAction] = useState(null)
    const debounceRef = useRef(null)

    const fetchCoaches = useCallback(() => {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (statusFilter) params.set('status', statusFilter)
        apiFetch(`/admin/coaches?${params}`)
            .then(d => setCoaches(d.coaches || d.data || []))
            .catch(() => showToast('Error loading coaches'))
    }, [search, statusFilter, showToast])

    useEffect(() => { fetchCoaches() }, [fetchCoaches])

    useEffect(() => {
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [])

    const handleSearch = (val) => {
        setSearch(val)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchCoaches(), 400)
    }

    const toggleSelect = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const toggleSelectAll = () => {
        if (selected.length === coaches.length) setSelected([])
        else setSelected(coaches.map(c => c.id))
    }

    const approveCoach = async (id) => {
        try { await apiFetch(`/admin/coaches/${id}/approve`, { method: 'PUT', body: JSON.stringify({ status: 'approved' }) }); showToast('Coach approved'); fetchCoaches() }
        catch (e) { showToast(e.message || 'Error') }
    }

    const rejectCoach = async (id) => {
        try { await apiFetch(`/admin/coaches/${id}/approve`, { method: 'PUT', body: JSON.stringify({ status: 'rejected' }) }); showToast('Coach rejected'); fetchCoaches() }
        catch (e) { showToast(e.message || 'Error') }
    }

    const suspendUser = async (id) => {
        const coach = coaches.find(c => c.id === id) || selectedCoach
        setConfirmAction({ type: 'suspend', user: coach })
    }

    const deleteUser = async (id) => {
        const coach = coaches.find(c => c.id === id) || selectedCoach
        setConfirmAction({ type: 'delete', user: coach })
    }

    const viewCoach = async (coach) => {
        setSelectedCoach(coach)
        setCoachModalOpen(true)
    }

    const executeConfirmAction = async () => {
        if (!confirmAction) return
        const { type, user } = confirmAction
        try {
            if (type === 'delete') {
                await apiFetch(`/admin/users/${user.id}`, { method: 'DELETE' })
                showToast('Coach deleted')
            } else if (type === 'batch-delete') {
                await apiFetch('/admin/users/batch/delete', { method: 'POST', body: JSON.stringify({ ids: selected }) })
                showToast(`${selected.length} coaches deleted`)
                setSelected([])
            } else if (type === 'suspend') {
                await apiFetch(`/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ status: 'suspended' }) })
                showToast('Coach suspended')
            }
            setConfirmAction(null)
            setCoachModalOpen(false)
            setSelectedCoach(null)
            fetchCoaches()
        } catch (e) { showToast(e.message || 'Error'); setConfirmAction(null) }
    }

    const batchApprove = async () => {
        if (!selected.length) return
        try {
            for (const id of selected) {
                await apiFetch(`/admin/coaches/${id}/approve`, { method: 'PUT', body: JSON.stringify({ status: 'approved' }) })
            }
            showToast(`${selected.length} coaches approved`)
            setSelected([])
            fetchCoaches()
        } catch (e) { showToast(e.message || 'Error') }
    }

    const batchReject = async () => {
        if (!selected.length) return
        try {
            for (const id of selected) {
                await apiFetch(`/admin/coaches/${id}/approve`, { method: 'PUT', body: JSON.stringify({ status: 'rejected' }) })
            }
            showToast(`${selected.length} coaches rejected`)
            setSelected([])
            fetchCoaches()
        } catch (e) { showToast(e.message || 'Error') }
    }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><Award size={24} /> Coach Management</h1>
                <div className="ad-content-actions">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#525252' }} />
                        <input className="ad-content-search" style={{ paddingLeft: 36 }} placeholder="Search coaches..." value={search} onChange={e => handleSearch(e.target.value)} />
                    </div>
                    <select className="ad-content-search" style={{ minWidth: 120 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    {selected.length > 0 && (
                        <>
                            <button className="ad-btn ad-btn-primary ad-btn-xs" onClick={batchApprove}><Check size={14} /> Approve ({selected.length})</button>
                            <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={batchReject}><Ban size={14} /> Reject ({selected.length})</button>
                            <button className="ad-btn ad-btn-danger ad-btn-xs" style={{ background: '#991b1b' }} onClick={() => setConfirmAction({ type: 'batch-delete', user: null })}><Trash2 size={14} /> Delete ({selected.length})</button>
                        </>
                    )}
                </div>
            </div>
            <div className="ad-dash-card" style={{ margin: '24px' }}>
                <table className="ad-table">
                    <thead>
                        <tr>
                            <th style={{ width: 40 }}><input type="checkbox" checked={selected.length === coaches.length && coaches.length > 0} onChange={toggleSelectAll} style={{ accentColor: 'var(--power-500)' }} /></th>
                            <th>Coach</th>
                            <th>Specializations</th>
                            <th>Experience</th>
                            <th>Rating</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {coaches.map(c => (
                            <tr key={c.id} className="ad-user-row">
                                <td><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} style={{ accentColor: 'var(--power-500)' }} /></td>
                                <td onClick={() => viewCoach(c)}><div className="ad-user-cell"><img loading="lazy" src={'https://picsum.photos/seed/coach-' + c.id + '/40/40.jpg'} alt="" className="ad-user-avatar" /><div className="ad-user-cell-info"><div>{c.firstName} {c.lastName}</div><div>{c.email}</div></div></div></td>
                                <td><span className="ad-time">{(c.specializations || []).join(', ') || '-'}</span></td>
                                <td><span className="ad-time">{c.experience ? c.experience + ' years' : '-'}</span></td>
                                <td><span className="ad-time">{c.avgRating ? c.avgRating.toFixed(1) + ' ★' : '-'}</span></td>
                                <td><span className={'ad-status-badge ad-status-' + (c.status === 'approved' || c.user_status === 'active' ? 'active' : c.status === 'rejected' || c.user_status === 'suspended' ? 'cancelled' : 'pending')}><span className="ad-status-dot" />{c.trainerStatus || c.status || c.user_status}</span></td>
                                <td>
                                    {c.status === 'pending' && (
                                        <>
                                            <button className="ad-btn ad-btn-primary ad-btn-xs" style={{ marginRight: 4 }} onClick={() => approveCoach(c.id)}><Check size={14} /> Approve</button>
                                            <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => rejectCoach(c.id)}><X size={14} /> Reject</button>
                                        </>
                                    )}
                                    {c.status === 'approved' && (
                                        <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => rejectCoach(c.id)}>Revoke</button>
                                    )}
                                    {c.status === 'rejected' && (
                                        <button className="ad-btn ad-btn-primary ad-btn-xs" style={{ marginRight: 4 }} onClick={() => approveCoach(c.id)}>Reinstate</button>
                                    )}
                                    <button className="ad-btn ad-btn-danger ad-btn-xs" style={{ marginLeft: 4, background: '#991b1b' }} onClick={() => deleteUser(c.id)} title="Delete coach"><Trash2 size={12} /></button>
                                </td>
                            </tr>
                        ))}
                        {coaches.length === 0 && (
                            <tr><td colSpan={7} style={{ textAlign: 'center', color: '#737373', padding: 32 }}>No coaches found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Coach Detail Modal */}
            <div className={'ad-modal-overlay' + (coachModalOpen ? ' ad-modal-open' : '')} onClick={e => { if (e.target === e.currentTarget) { setCoachModalOpen(false); setSelectedCoach(null) } }}>
                <div className="ad-modal-content">
                    <div className="ad-modal-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <h3 className="ad-modal-title">Coach Profile</h3>
                        <button className="ad-modal-close" onClick={() => { setCoachModalOpen(false); setSelectedCoach(null) }}><X /></button>
                    </div>
                    {selectedCoach && (
                        <>
                            <div className="ad-modal-profile">
                                <img loading="lazy" src={'https://picsum.photos/seed/coach-' + selectedCoach.id + '/80/80.jpg'} alt="" className="ad-modal-avatar" />
                                <div>
                                    <div className="ad-modal-user-name">{selectedCoach.firstName} {selectedCoach.lastName}</div>
                                    <div className="ad-modal-user-meta">{selectedCoach.email} · ID: {selectedCoach.id}</div>
                                    <div className="ad-modal-user-tags">
                                        <span className={'ad-status-badge ad-status-' + (selectedCoach.status === 'approved' || selectedCoach.user_status === 'active' ? 'active' : selectedCoach.status === 'rejected' ? 'cancelled' : 'pending')}><span className="ad-status-dot" />{selectedCoach.trainerStatus || selectedCoach.status}</span>
                                        <span style={{ color: 'var(--power-500)', fontSize: 12, fontWeight: 600 }}>COACH</span>
                                    </div>
                                </div>
                            </div>
                            <div className="ad-modal-info-grid">
                                <div className="ad-modal-info-item"><div className="ad-modal-info-label">Rating</div><div className="ad-modal-info-value">{selectedCoach.avgRating ? selectedCoach.avgRating.toFixed(1) + ' ★' : 'N/A'}</div></div>
                                <div className="ad-modal-info-item"><div className="ad-modal-info-label">Experience</div><div className="ad-modal-info-value">{selectedCoach.experience ? selectedCoach.experience + ' years' : 'N/A'}</div></div>
                                <div className="ad-modal-info-item"><div className="ad-modal-info-label">Member Since</div><div className="ad-modal-info-value">{selectedCoach.registered ? new Date(selectedCoach.registered).toLocaleDateString() : 'N/A'}</div></div>
                                <div className="ad-modal-info-item"><div className="ad-modal-info-label">Bio</div><div className="ad-modal-info-value">{selectedCoach.bio || 'N/A'}</div></div>
                            </div>
                            <div className="ad-modal-actions">
                                {selectedCoach.status === 'pending' && (
                                    <>
                                        <button className="ad-btn ad-btn-primary" onClick={() => { approveCoach(selectedCoach.id); setCoachModalOpen(false) }}>Approve</button>
                                        <button className="ad-btn ad-btn-danger" onClick={() => { rejectCoach(selectedCoach.id); setCoachModalOpen(false) }}>Reject</button>
                                    </>
                                )}
                                {selectedCoach.status === 'approved' && (
                                    <button className="ad-btn ad-btn-danger" onClick={() => { rejectCoach(selectedCoach.id); setCoachModalOpen(false) }}>Revoke</button>
                                )}
                                {selectedCoach.status === 'rejected' && (
                                    <button className="ad-btn ad-btn-primary" onClick={() => { approveCoach(selectedCoach.id); setCoachModalOpen(false) }}>Reinstate</button>
                                )}
                                <button className="ad-btn ad-btn-danger" style={{ background: '#991b1b' }} onClick={() => deleteUser(selectedCoach.id)}><Trash2 size={14} /> Delete</button>
                                <button className="ad-btn ad-btn-secondary" style={{ flex: '0', padding: '12px 16px' }} onClick={() => { setCoachModalOpen(false); setSelectedCoach(null) }}><X size={16} /></button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Confirm Modal */}
            {confirmAction && (
                <div className="ad-modal-overlay ad-modal-open" onClick={(e) => { if (e.target === e.currentTarget) setConfirmAction(null) }}>
                    <div className="ad-modal-content" style={{ maxWidth: 420, textAlign: 'center' }}>
                        {confirmAction.type === 'delete' ? (
                            <>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <AlertTriangle size={32} color="#ef4444" />
                                </div>
                                <h3 className="ad-modal-title" style={{ textAlign: 'center', marginBottom: 8 }}>Delete Coach</h3>
                                <p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                                    Are you sure you want to permanently delete <strong style={{ color: '#fff' }}>{confirmAction.user?.firstName} {confirmAction.user?.lastName}</strong> ({confirmAction.user?.email})?<br />
                                    <span style={{ color: '#ef4444', fontSize: 13 }}>This action cannot be undone.</span>
                                </p>
                            </>
                        ) : confirmAction.type === 'batch-delete' ? (
                            <>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <AlertTriangle size={32} color="#ef4444" />
                                </div>
                                <h3 className="ad-modal-title" style={{ textAlign: 'center', marginBottom: 8 }}>Delete {selected.length} Coaches</h3>
                                <p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                                    Are you sure you want to permanently delete <strong style={{ color: '#fff' }}>{selected.length} selected coaches</strong>?<br />
                                    <span style={{ color: '#ef4444', fontSize: 13 }}>This action cannot be undone.</span>
                                </p>
                            </>
                        ) : (
                            <>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <AlertTriangle size={32} color="#f59e0b" />
                                </div>
                                <h3 className="ad-modal-title" style={{ textAlign: 'center', marginBottom: 8 }}>Suspend User</h3>
                                <p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                                    Are you sure you want to suspend <strong style={{ color: '#fff' }}>{confirmAction.user?.firstName} {confirmAction.user?.lastName}</strong>?<br />
                                    <span style={{ color: '#f59e0b', fontSize: 13 }}>The user will not be able to access the platform.</span>
                                </p>
                            </>
                        )}
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="ad-btn ad-btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
                            <button
                                className="ad-btn"
                                style={{
                                    background: confirmAction.type === 'delete' || confirmAction.type === 'batch-delete' ? '#dc2626' : undefined,
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                                onClick={executeConfirmAction}
                            >
                                {(confirmAction.type === 'delete' || confirmAction.type === 'batch-delete') && <Trash2 size={14} />}
                                {confirmAction.type === 'batch-delete' ? `Delete ${selected.length}` : confirmAction.type === 'delete' ? 'Delete' : 'Suspend'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
