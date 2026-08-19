import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { BarChart3, DollarSign, TrendingUp, Target, Users, Award } from 'lucide-react'

export default function AdminAnalytics() {
    const { showToast } = useToast()
    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        apiFetch('/admin/analytics')
            .then(setAnalytics)
            .catch(() => showToast('Error loading analytics'))
            .finally(() => setLoading(false))
    }, [showToast])

    const a = analytics || {}

    const revenueByMonth = a.revenueByMonth || []
    const usersByMonth = a.usersByMonth || []
    const lastMonthRevenue = revenueByMonth.length > 0 ? revenueByMonth[revenueByMonth.length - 1].revenue : 0
    const maxRevenue = Math.max(...revenueByMonth.map(r => r.revenue), 1)
    const maxUsers = Math.max(...usersByMonth.map(u => u.count), 1)

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><BarChart3 size={24} /> Analytics</h1>
            </div>
            <div className="ad-kpi-grid">
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-green"><DollarSign /></div><div className="ad-kpi-value">${(a.totalRevenue || 0).toLocaleString()}</div><div className="ad-kpi-label">Total Revenue</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-blue"><TrendingUp /></div><div className="ad-kpi-value">${lastMonthRevenue.toLocaleString()}</div><div className="ad-kpi-label">Revenue (last recorded month)</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-yellow"><Users /></div><div className="ad-kpi-value">{(a.totalUsers || 0).toLocaleString()}</div><div className="ad-kpi-label">Total Users</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-purple"><Award /></div><div className="ad-kpi-value">{(a.totalCoaches || 0).toLocaleString()} / {(a.totalClients || 0).toLocaleString()}</div><div className="ad-kpi-label">Coaches / Clients</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-red"><Target /></div><div className="ad-kpi-value">{a.completionRate || 0}%</div><div className="ad-kpi-label">Session Completion</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-red"><DollarSign /></div><div className="ad-kpi-value">{a.paymentFailureRate30d != null ? a.paymentFailureRate30d + '%' : '—'}</div><div className="ad-kpi-label">Payment Failure Rate (30d)</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-yellow"><TrendingUp /></div><div className="ad-kpi-value">{a.churnThisMonth != null ? a.churnThisMonth + '%' : '—'}</div><div className="ad-kpi-label">Churn (this month)</div></div>
            </div>
            <div className="ad-section-grid ad-section-grid-2">
                <div className="ad-dash-card">
                    <h3 className="ad-section-title-sm">Revenue by Month (last 12 months)</h3>
                    {revenueByMonth.length === 0 ? (
                        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>No payment data yet.</div>
                    ) : (
                        <div className="ad-bar-chart" style={{ marginTop: 24 }}>
                            {revenueByMonth.map((r, i) => (
                                <div key={r.month + '-' + i} className="ad-bar-col">
                                    <span className="ad-bar-label">{r.month}</span>
                                    <div className="ad-bar-fill ad-bar-green" style={{ height: (r.revenue / maxRevenue * 100) + '%' }} />
                                    <span className="ad-bar-value">${r.revenue}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="ad-dash-card">
                    <h3 className="ad-section-title-sm">New Users by Month (last 12 months)</h3>
                    {usersByMonth.length === 0 ? (
                        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>No signup data yet.</div>
                    ) : (
                        <div className="ad-bar-chart" style={{ marginTop: 24 }}>
                            {usersByMonth.map((u, i) => (
                                <div key={u.month + '-' + i} className="ad-bar-col">
                                    <span className="ad-bar-label">{u.month}</span>
                                    <div className="ad-bar-fill ad-bar-blue" style={{ height: (u.count / maxUsers * 100) + '%' }} />
                                    <span className="ad-bar-value">{u.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="ad-dash-card" style={{ margin: '0 24px 24px' }}>
                <h3 className="ad-section-title-sm">Cancellation Reasons (last 12 months)</h3>
                {(a.cancellationReasons || []).length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No cancellations recorded yet — reasons are captured when a user cancels.
                    </div>
                ) : (
                    <div style={{ marginTop: 16 }}>
                        {(a.cancellationReasons || []).map((r, i) => {
                            const max = Math.max(...(a.cancellationReasons || []).map(x => x.count), 1)
                            return (
                                <div key={i} style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                                        <span style={{ color: '#d4d4d4' }}>{r.reason}</span>
                                        <span style={{ color: '#fff', fontWeight: 600 }}>{r.count}</span>
                                    </div>
                                    <div className="ad-tier-bar"><div className="ad-tier-fill" style={{ width: (r.count / max * 100) + '%', background: '#f87171' }} /></div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
            {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics...</div>}
        </div>
    )
}
