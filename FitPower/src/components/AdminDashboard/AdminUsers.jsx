import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { Search, Filter, X, Check, Ban, Trash2, AlertTriangle } from 'lucide-react'

export default function AdminUsers() {
    const { showToast } = useToast()
    const [users, setUsers] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [selected, setSelected] = useState([])
    const [userModalOpen, setUserModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [confirmAction, setConfirmAction] = useState(null)
    const debounceRef = useRef(null)

    const fetchUsers = useCallback((p = 1, s = '', r = '', st = '') => {
        const params = new URLSearchParams({ page: p, perPage: 20 })
        if (s) params.set('search', s)
        if (r) params.set('role', r)
        if (st) params.set('status', st)
        apiFetch(`/admin/users?${params}`)
            .then(d => { setUsers(d.users || []); setTotal(d.total || 0); setPage(d.page || 1) })
            .catch(() => showToast('Error loading users'))
    }, [showToast])

    useEffect(() => { fetchUsers(page, search, roleFilter, statusFilter) }, [page, roleFilter, statusFilter, fetchUsers])

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    const handleSearch = (val) => {
        setSearch(val)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => { setPage(1); fetchUsers(1, val, roleFilter, statusFilter) }, 400)
    }

    const toggleSelect = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const toggleSelectAll = () => {
        if (selected.length === users.length) setSelected([])
        else setSelected(users.map(u => u.id))
    }

    const batchAction = async (action) => {
        if (!selected.length) return
        try {
            await apiFetch(`/admin/users/batch/${action}`, { method: 'POST', body: JSON.stringify({ ids: selected }) })
            showToast(`Users ${action}ed successfully`)
            setSelected([])
            fetchUsers(page, search, roleFilter, statusFilter)
        } catch (e) { showToast(e.message || `Error ${action}ing users`) }
    }

    const viewUser = async (user) => {
        try {
            const detail = await apiFetch(`/admin/users/${user.id}`)
            setSelectedUser(detail)
        } catch { setSelectedUser(user) }
        setUserModalOpen(true)
    }

    const suspendUser = async (id) => {
        const user = users.find(u => u.id === id) || selectedUser
        setConfirmAction({ type: 'suspend', user })
    }

    const activateUser = async (id) => {
        try { await apiFetch(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'active' }) }); showToast('User activated'); fetchUsers(page, search, roleFilter, statusFilter) }
        catch (e) { showToast(e.message || 'Error') }
    }

    const deleteUser = async (id) => {
        const user = users.find(u => u.id === id) || selectedUser
        setConfirmAction({ type: 'delete', user })
    }

    const executeConfirmAction = async () => {
        if (!confirmAction) return
        const { type, user } = confirmAction
        try {
            if (type === 'delete') {
                await apiFetch(`/admin/users/${user.id}`, { method: 'DELETE' })
                showToast('User deleted')
            } else if (type === 'batch-delete') {
                await apiFetch('/admin/users/batch/delete', { method: 'POST', body: JSON.stringify({ ids: selected }) })
                showToast(`${selected.length} users deleted`)
                setSelected([])
            } else if (type === 'suspend') {
                const newStatus = user.status === 'suspended' ? 'active' : 'suspended'
                await apiFetch(`/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) })
                showToast('User ' + (newStatus === 'suspended' ? 'suspended' : 'activated'))
            }
            setConfirmAction(null)
            setUserModalOpen(false)
            setSelectedUser(null)
            fetchUsers(page, search, roleFilter, statusFilter)
        } catch (e) { showToast(e.message || 'Error'); setConfirmAction(null) }
    }

    const totalPages = Math.ceil(total / 20)

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><Filter size={24} /> User Management</h1>
                <div className="ad-content-actions">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#525252' }} />
                        <input className="ad-content-search" style={{ paddingLeft: 36 }} placeholder="Search users..." value={search} onChange={e => handleSearch(e.target.value)} />
                    </div>
                    <select className="ad-content-search" style={{ minWidth: 120 }} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}>
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="coach">Coach</option>
                        <option value="client">Client</option>
                    </select>
                    <select className="ad-content-search" style={{ minWidth: 120 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="pending">Pending</option>
                    </select>
                    {selected.length > 0 && (
                        <>
                            <button className="ad-btn ad-btn-primary ad-btn-xs" onClick={() => batchAction('activate')}><Check size={14} /> Activate ({selected.length})</button>
                            <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => batchAction('suspend')}><Ban size={14} /> Suspend ({selected.length})</button>
                            <button className="ad-btn ad-btn-danger ad-btn-xs" style={{ background: '#991b1b' }} onClick={() => setConfirmAction({ type: 'batch-delete', user: null })}><Trash2 size={14} /> Delete ({selected.length})</button>
                        </>
                    )}
                </div>
            </div>
            <div className="ad-dash-card" style={{ margin: '24px' }}>
                <table className="ad-table">
                    <thead>
                        <tr>
                            <th style={{ width: 40 }}><input type="checkbox" checked={selected.length === users.length && users.length > 0} onChange={toggleSelectAll} style={{ accentColor: 'var(--power-500)' }} /></th>
                            <th>User</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Member Since</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="ad-user-row">
                                <td><input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} style={{ accentColor: 'var(--power-500)' }} /></td>
                                <td onClick={() => viewUser(u)}><div className="ad-user-cell"><img loading="lazy" src={'https://picsum.photos/seed/user-' + u.id + '/40/40.jpg'} alt="" className="ad-user-avatar" /><div className="ad-user-cell-info"><div>{u.firstName} {u.lastName}</div><div>{u.email}</div></div></div></td>
                                <td><span className={'ad-tier-label ad-tier-' + (u.role === 'admin' ? 'pro' : u.role === 'coach' ? 'elite' : 'starter')}>{u.role || 'client'}</span></td>
                                <td><span className={'ad-status-badge ad-status-' + (u.status === 'active' ? 'active' : u.status === 'suspended' ? 'cancelled' : 'pending')}><span className="ad-status-dot" />{u.status}</span></td>
                                <td><span className="ad-time">{u.registered ? new Date(u.registered).toLocaleDateString() : '-'}</span></td>
                                <td>
                                    <button className="ad-btn ad-btn-secondary ad-btn-xs" style={{ marginRight: 4 }} onClick={() => viewUser(u)}>View</button>
                                    {u.status === 'suspended'
                                        ? <button className="ad-btn ad-btn-primary ad-btn-xs" onClick={() => activateUser(u.id)}>Activate</button>
                                        : <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => suspendUser(u.id)}>Suspend</button>}
                                    <button className="ad-btn ad-btn-danger ad-btn-xs" style={{ marginLeft: 4, background: '#991b1b' }} onClick={() => deleteUser(u.id)} title="Delete user"><Trash2 size={12} /></button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#737373', padding: 32 }}>No users found</td></tr>
                        )}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i} className={'ad-btn ad-btn-xs ' + (page === i + 1 ? 'ad-btn-primary' : 'ad-btn-secondary')} onClick={() => setPage(i + 1)}>{i + 1}</button>
                        ))}
                    </div>
                )}
            </div>

            <div className={'ad-modal-overlay' + (userModalOpen ? ' ad-modal-open' : '')} onClick={e => { if (e.target === e.currentTarget) { setUserModalOpen(false); setSelectedUser(null) } }}>
                <div className="ad-modal-content">
                    <div className="ad-modal-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <h3 className="ad-modal-title">User Profile</h3>
                        <button className="ad-modal-close" onClick={() => { setUserModalOpen(false); setSelectedUser(null) }}><X /></button>
                    </div>
                    {selectedUser && (
                        <>
                            <div className="ad-modal-profile">
                                <img loading="lazy" src={'https://picsum.photos/seed/user-' + selectedUser.id + '/80/80.jpg'} alt="" className="ad-modal-avatar" />
                                <div>
                                    <div className="ad-modal-user-name">{selectedUser.firstName} {selectedUser.lastName}</div>
                                    <div className="ad-modal-user-meta">{selectedUser.email} · UID: {selectedUser.id}</div>
                                    <div className="ad-modal-user-tags">
                                        <span className={'ad-status-badge ad-status-' + (selectedUser.status === 'active' ? 'active' : 'cancelled')}><span className="ad-status-dot" />{selectedUser.status}</span>
                                        <span style={{ color: 'var(--power-500)', fontSize: 12, fontWeight: 600 }}>{(selectedUser.role || 'client').toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="ad-modal-info-grid">
                                <div className="ad-modal-info-item"><div className="ad-modal-info-label">Programs Enrolled</div><div className="ad-modal-info-value">{(selectedUser.programs?.length || selectedUser.enrolledPrograms?.length || 0)}</div></div>
                                <div className="ad-modal-info-item"><div className="ad-modal-info-label">Subscription</div><div className="ad-modal-info-value">{selectedUser.subscription?.plan || selectedUser.subscription?.name || 'No Plan'}</div></div>
                                <div className="ad-modal-info-item"><div className="ad-modal-info-label">Subscription Status</div><div className="ad-modal-info-value">{selectedUser.subscription?.status || 'N/A'}</div></div>
                                <div className="ad-modal-info-item"><div className="ad-modal-info-label">Member Since</div><div className="ad-modal-info-value">{selectedUser.registered ? new Date(selectedUser.registered).toLocaleDateString() : 'N/A'}</div></div>
                                <div className="ad-modal-info-item"><div className="ad-modal-info-label">Last Active</div><div className="ad-modal-info-value">{selectedUser.lastActive ? new Date(selectedUser.lastActive).toLocaleDateString() : 'N/A'}</div></div>
                                <div className="ad-modal-info-item"><div className="ad-modal-info-label">Fitness Level</div><div className="ad-modal-info-value">{selectedUser.fitnessLevel || 'N/A'}</div></div>
                            </div>
                            <div className="ad-modal-actions">
                                {selectedUser.status === 'suspended'
                                    ? <button className="ad-btn ad-btn-primary" onClick={() => { activateUser(selectedUser.id); setUserModalOpen(false) }}>Activate User</button>
                                    : <button className="ad-btn ad-btn-danger" onClick={() => { suspendUser(selectedUser.id); setUserModalOpen(false) }}>Suspend User</button>}
                                <button className="ad-btn ad-btn-danger" style={{ background: '#991b1b' }} onClick={() => { deleteUser(selectedUser.id); setUserModalOpen(false) }}><Trash2 size={14} /> Delete</button>
                                <button className="ad-btn ad-btn-secondary" onClick={() => { setUserModalOpen(false); setSelectedUser(null) }}><X size={16} /></button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {confirmAction && (
                <div className="ad-modal-overlay ad-modal-open" onClick={(e) => { if (e.target === e.currentTarget) setConfirmAction(null) }}>
                    <div className="ad-modal-content" style={{ maxWidth: 420, textAlign: 'center' }}>
                        {confirmAction.type === 'delete' ? (
                            <>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <AlertTriangle size={32} color="#ef4444" />
                                </div>
                                <h3 className="ad-modal-title" style={{ textAlign: 'center', marginBottom: 8 }}>Eliminar usuario</h3>
                                <p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                                    ¿Eliminar permanentemente a <strong style={{ color: '#fff' }}>{confirmAction.user?.firstName} {confirmAction.user?.lastName}</strong> ({confirmAction.user?.email})?<br />
                                    <span style={{ color: '#ef4444', fontSize: 13 }}>Esta acción no se puede deshacer.</span>
                                </p>
                            </>
                        ) : confirmAction.type === 'batch-delete' ? (
                            <>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <AlertTriangle size={32} color="#ef4444" />
                                </div>
                                <h3 className="ad-modal-title" style={{ textAlign: 'center', marginBottom: 8 }}>Eliminar {selected.length} usuarios</h3>
                                <p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                                    ¿Eliminar permanentemente <strong style={{ color: '#fff' }}>{selected.length} usuarios seleccionados</strong>?<br />
                                    <span style={{ color: '#ef4444', fontSize: 13 }}>Esta acción no se puede deshacer.</span>
                                </p>
                            </>
                        ) : (
                            <>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <AlertTriangle size={32} color="#f59e0b" />
                                </div>
                                <h3 className="ad-modal-title" style={{ textAlign: 'center', marginBottom: 8 }}>
                                    {confirmAction.user?.status === 'suspended' ? 'Reactivar' : 'Suspender'} usuario
                                </h3>
                                <p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                                    ¿{confirmAction.user?.status === 'suspended' ? 'Reactivar' : 'Suspender'} a <strong style={{ color: '#fff' }}>{confirmAction.user?.firstName} {confirmAction.user?.lastName}</strong>?
                                    {confirmAction.user?.status !== 'suspended' && <><br /><span style={{ color: '#f59e0b', fontSize: 13 }}>El usuario no podrá acceder a la plataforma.</span></>}
                                </p>
                            </>
                        )}
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="ad-btn ad-btn-secondary" onClick={() => setConfirmAction(null)}>Cancelar</button>
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
                                {confirmAction.type === 'batch-delete' ? `Eliminar ${selected.length}` : confirmAction.type === 'delete' ? 'Eliminar' : confirmAction.user?.status === 'suspended' ? 'Reactivar' : 'Suspender'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
