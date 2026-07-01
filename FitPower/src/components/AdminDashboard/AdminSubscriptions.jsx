import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { DollarSign, Users, TrendingUp, Activity, X } from 'lucide-react'

export default function AdminSubscriptions() {
    const { showToast } = useToast()
    const [metrics, setMetrics] = useState(null)
    const [subscriptions, setSubscriptions] = useState([])
    const [planModalOpen, setPlanModalOpen] = useState(false)
    const [selectedSub, setSelectedSub] = useState(null)
    const [newPlan, setNewPlan] = useState('')

    useEffect(() => {
        apiFetch('/admin/subscriptions/metrics').then(setMetrics).catch(() => {})
        apiFetch('/admin/subscriptions').then(d => setSubscriptions(d.subscriptions || d.data || [])).catch(() => {})
    }, [])

    const cancelSubscription = async (id) => {
        if (!confirm('Cancel this subscription?')) return
        try { await apiFetch(`/admin/subscriptions/${id}/cancel`, { method: 'PUT' }); showToast('Subscription cancelled'); apiFetch('/admin/subscriptions').then(d => setSubscriptions(d.subscriptions || d.data || [])).catch(() => {}) }
        catch (e) { showToast(e.message || 'Error') }
    }

    const changePlan = async () => {
        if (!selectedSub || !newPlan) return
        try { await apiFetch(`/admin/subscriptions/${selectedSub.id}/plan`, { method: 'PUT', body: JSON.stringify({ plan: newPlan }) }); showToast('Plan changed'); setPlanModalOpen(false); setSelectedSub(null); setNewPlan(''); apiFetch('/admin/subscriptions').then(d => setSubscriptions(d.subscriptions || d.data || [])).catch(() => {}) }
        catch (e) { showToast(e.message || 'Error') }
    }

    const m = metrics || {}

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><DollarSign size={24} /> Subscriptions</h1>
            </div>
            <div className="ad-kpi-grid" style={{ padding: '0 24px' }}>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-green"><DollarSign /></div><div className="ad-kpi-value">${(m.mrr || 0).toLocaleString()}</div><div className="ad-kpi-label">MRR</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-blue"><Users /></div><div className="ad-kpi-value">{(m.activeSubscriptions || 0).toLocaleString()}</div><div className="ad-kpi-label">Active Subs</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-yellow"><TrendingUp /></div><div className="ad-kpi-value">{m.churnRate || 0}%</div><div className="ad-kpi-label">Churn Rate</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-purple"><Activity /></div><div className="ad-kpi-value">${m.arpu || 0}</div><div className="ad-kpi-label">ARPU</div></div>
            </div>
            <div className="ad-dash-card" style={{ margin: '24px' }}>
                <table className="ad-table">
                    <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Start Date</th><th>End Date</th><th>Actions</th></tr></thead>
                    <tbody>
                        {subscriptions.map(sub => (
                            <tr key={sub.id} className="ad-user-row">
                                <td><div className="ad-user-cell"><img loading="lazy" src={'https://picsum.photos/seed/sub-' + sub.id + '/40/40.jpg'} alt="" className="ad-user-avatar" /><div className="ad-user-cell-info"><div>{sub.user?.firstName || sub.userName || 'User'} {sub.user?.lastName || ''}</div><div>{sub.user?.email || sub.email || ''}</div></div></div></td>
                                <td><span className="ad-tier-label ad-tier-pro">{sub.plan || sub.planName}</span></td>
                                <td><span className={'ad-status-badge ad-status-' + (sub.status === 'active' ? 'active' : sub.status === 'cancelled' ? 'cancelled' : 'pending')}><span className="ad-status-dot" />{sub.status}</span></td>
                                <td><span className="ad-time">{sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '-'}</span></td>
                                <td><span className="ad-time">{sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'Ongoing'}</span></td>
                                <td>
                                    <button className="ad-btn ad-btn-secondary ad-btn-xs" style={{ marginRight: 4 }} onClick={() => { setSelectedSub(sub); setNewPlan(sub.plan || ''); setPlanModalOpen(true) }}>Change Plan</button>
                                    {sub.status !== 'cancelled' && <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => cancelSubscription(sub.id)}>Cancel</button>}
                                </td>
                            </tr>
                        ))}
                        {subscriptions.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#737373', padding: 32 }}>No subscriptions found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className={'ad-modal-overlay' + (planModalOpen ? ' ad-modal-open' : '')} onClick={e => { if (e.target === e.currentTarget) { setPlanModalOpen(false); setSelectedSub(null) } }}>
                <div className="ad-modal-content" style={{ maxWidth: 420 }}>
                    <div className="ad-modal-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <h3 className="ad-modal-title">Change Plan</h3>
                        <button className="ad-modal-close" onClick={() => { setPlanModalOpen(false); setSelectedSub(null) }}><X /></button>
                    </div>
                    <div style={{ padding: '0 24px 24px' }}>
                        <label style={{ display: 'block', color: '#a3a3a3', fontSize: 14, marginBottom: 8 }}>New Plan</label>
                        <select className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} value={newPlan} onChange={e => setNewPlan(e.target.value)}>
                            <option value="">Select a plan</option>
                            <option value="Starter">Starter</option>
                            <option value="Pro">Pro</option>
                            <option value="Elite">Elite</option>
                        </select>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                            <button className="ad-btn ad-btn-secondary" onClick={() => { setPlanModalOpen(false); setSelectedSub(null) }}>Cancel</button>
                            <button className="ad-btn ad-btn-primary" disabled={!newPlan} onClick={changePlan}>Save</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
