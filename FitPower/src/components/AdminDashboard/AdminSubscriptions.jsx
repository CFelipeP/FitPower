import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { confirmSwal, swalError } from '../../lib/alerts'
import { exportToCSV } from '../../lib/export'
import Avatar from '../Avatar/Avatar'
import { DollarSign, Users, TrendingUp, Activity, X, Download } from 'lucide-react'

export default function AdminSubscriptions() {
    const { showToast } = useToast()
    const [metrics, setMetrics] = useState(null)
    const [subscriptions, setSubscriptions] = useState([])
    const [plans, setPlans] = useState([])
    const [planModalOpen, setPlanModalOpen] = useState(false)
    const [selectedSub, setSelectedSub] = useState(null)
    const [newPlan, setNewPlan] = useState('')

    const reload = () => {
        apiFetch('/admin/subscriptions').then(d => setSubscriptions(Array.isArray(d) ? d : (d.subscriptions || d.data || []))).catch(() => {})
        apiFetch('/admin/subscriptions/metrics').then(setMetrics).catch(() => {})
    }

    useEffect(() => {
        reload()
        apiFetch('/admin/plans').then(d => setPlans(Array.isArray(d) ? d : (d.plans || d.data || []))).catch(() => {})
    }, [])

    const cancelSubscription = async (id) => {
        if (!(await confirmSwal('Cancel this subscription?'))) return
        try { await apiFetch(`/admin/subscriptions/${id}/cancel`, { method: 'PUT' }); showToast('Subscription cancelled'); reload() }
        catch (e) { swalError(e.message || 'Error') }
    }

    const changePlan = async () => {
        if (!selectedSub || !newPlan) return
        const plan = plans.find(p => String(p.id) === String(newPlan))
        if (!plan) { swalError('Select a plan'); return }
        try {
            await apiFetch(`/admin/subscriptions/${selectedSub.id}/plan`, { method: 'PUT', body: JSON.stringify({ planId: plan.id }) })
            showToast(`Plan changed to ${plan.name}`)
            setPlanModalOpen(false); setSelectedSub(null); setNewPlan('')
            reload()
        } catch (e) { swalError(e.message || 'Error') }
    }

    const handleExport = () => {
        const breakdown = metrics?.planBreakdown?.length ? metrics.planBreakdown : []
        if (!breakdown.length) { showToast('No subscription data to export'); return }
        exportToCSV(breakdown.map(t => ({
            plan: t.name || '',
            subscribers: t.count || 0,
            monthlyRevenue: t.revenue ?? '',
        })), 'fitpower-subscriptions.csv')
        showToast('Report exported')
    }

    const m = metrics || {}

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><DollarSign size={24} /> Subscriptions</h1>
                <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={handleExport}><Download size={16} /> Export Report</button>
            </div>
            <div className="ad-kpi-grid" style={{ padding: '0 24px' }}>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-green"><DollarSign /></div><div className="ad-kpi-value">${(m.mrr || 0).toLocaleString()}</div><div className="ad-kpi-label">MRR</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-blue"><Users /></div><div className="ad-kpi-value">{(m.activeSubscriptions || 0).toLocaleString()}</div><div className="ad-kpi-label">Active Subs</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-yellow"><TrendingUp /></div><div className="ad-kpi-value">{m.churnRate || 0}%</div><div className="ad-kpi-label">Churn Rate</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-purple"><Activity /></div><div className="ad-kpi-value">${m.arpu || 0}</div><div className="ad-kpi-label">ARPU</div></div>
            </div>
            <div className="ad-dash-card" style={{ margin: '24px' }}>
                <table className="ad-table">
                    <thead><tr><th>User</th><th>Plan</th><th>Billing</th><th>Provider</th><th>Status</th><th>Start Date</th><th>End Date</th><th>Actions</th></tr></thead>
                    <tbody>
                        {subscriptions.map(sub => (
                            <tr key={sub.id} className="ad-user-row" title={sub.providerSubscriptionId ? `Provider subscription: ${sub.providerSubscriptionId}` : ''}>
                                <td><div className="ad-user-cell"><Avatar name={sub.user?.firstName || sub.userName || 'User'} src={null} size={40} className="ad-user-avatar" /><div className="ad-user-cell-info"><div>{sub.user?.firstName || sub.userName || 'User'} {sub.user?.lastName || ''}</div><div>{sub.user?.email || sub.userEmail || sub.email || ''}</div></div></div></td>
                                <td><span className="ad-tier-label ad-tier-pro">{sub.plan || sub.planName}</span></td>
                                <td><span className="ad-time">{sub.billing === 'yearly' ? 'Annual' : 'Monthly'}</span></td>
                                <td><span className="ad-time">{sub.provider ? sub.provider[0].toUpperCase() + sub.provider.slice(1) : 'Manual'}</span></td>
                                <td><span className={'ad-status-badge ad-status-' + (sub.status === 'active' ? 'active' : sub.status === 'cancelled' ? 'cancelled' : 'pending')}><span className="ad-status-dot" />{sub.status}</span></td>
                                <td><span className="ad-time">{sub.startDate ? new Date(sub.startDate).toLocaleDateString() : sub.startedAt ? new Date(sub.startedAt).toLocaleDateString() : '-'}</span></td>
                                <td><span className="ad-time">{sub.endDate ? new Date(sub.endDate).toLocaleDateString() : sub.endsAt ? new Date(sub.endsAt).toLocaleDateString() : 'Ongoing'}</span></td>
                                <td>
                                    <button className="ad-btn ad-btn-secondary ad-btn-xs" style={{ marginRight: 4 }} onClick={() => { const cur = plans.find(p => p.name === (sub.planName || sub.plan)); setSelectedSub(sub); setNewPlan(cur ? String(cur.id) : ''); setPlanModalOpen(true) }}>Change Plan</button>
                                    {sub.status !== 'cancelled' && <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => cancelSubscription(sub.id)}>Cancel</button>}
                                </td>
                            </tr>
                        ))}
                        {subscriptions.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No subscriptions found</td></tr>
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
                            {plans.filter(p => p.status !== 'inactive').map(p => (
                                <option key={p.id} value={String(p.id)}>{p.name}</option>
                            ))}
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
