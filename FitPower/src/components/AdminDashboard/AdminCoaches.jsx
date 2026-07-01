import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { Search, Check, X, Award } from 'lucide-react'

export default function AdminCoaches() {
    const { showToast } = useToast()
    const [coaches, setCoaches] = useState([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const fetchCoaches = useCallback(() => {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (statusFilter) params.set('status', statusFilter)
        apiFetch(`/admin/coaches?${params}`)
            .then(d => setCoaches(d.coaches || d.data || []))
            .catch(() => showToast('Error loading coaches'))
    }, [search, statusFilter, showToast])

    useEffect(() => { fetchCoaches() }, [fetchCoaches])

    const approveCoach = async (id) => {
        try { await apiFetch(`/admin/coaches/${id}/approve`, { method: 'PUT', body: JSON.stringify({ status: 'approved' }) }); showToast('Coach approved'); fetchCoaches() }
        catch (e) { showToast(e.message || 'Error') }
    }

    const rejectCoach = async (id) => {
        try { await apiFetch(`/admin/coaches/${id}/approve`, { method: 'PUT', body: JSON.stringify({ status: 'rejected' }) }); showToast('Coach rejected'); fetchCoaches() }
        catch (e) { showToast(e.message || 'Error') }
    }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><Award size={24} /> Coach Management</h1>
                <div className="ad-content-actions">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#525252' }} />
                        <input className="ad-content-search" style={{ paddingLeft: 36 }} placeholder="Search coaches..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="ad-content-search" style={{ minWidth: 120 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>
            <div className="ad-dash-card" style={{ margin: '24px' }}>
                <table className="ad-table">
                    <thead>
                        <tr><th>Coach</th><th>Specializations</th><th>Experience</th><th>Certifications</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {coaches.map(c => (
                            <tr key={c.id} className="ad-user-row">
                                <td><div className="ad-user-cell"><img loading="lazy" src={'https://picsum.photos/seed/coach-' + c.id + '/40/40.jpg'} alt="" className="ad-user-avatar" /><div className="ad-user-cell-info"><div>{c.firstName} {c.lastName}</div><div>{c.email}</div></div></div></td>
                                <td><span className="ad-time">{(c.specializations || []).join(', ') || '-'}</span></td>
                                <td><span className="ad-time">{c.experience ? c.experience + ' years' : '-'}</span></td>
                                <td><span className="ad-time">{(c.certifications || []).join(', ') || '-'}</span></td>
                                <td><span className={'ad-status-badge ad-status-' + (c.status === 'approved' ? 'active' : c.status === 'rejected' ? 'cancelled' : 'pending')}><span className="ad-status-dot" />{c.status}</span></td>
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
                                        <button className="ad-btn ad-btn-primary ad-btn-xs" onClick={() => approveCoach(c.id)}>Reinstate</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {coaches.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#737373', padding: 32 }}>No coaches found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
