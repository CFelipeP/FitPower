import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { BarChart3, DollarSign, TrendingUp, Target } from 'lucide-react'

export default function AdminAnalytics() {
    const { showToast } = useToast()
    const [analytics, setAnalytics] = useState(null)
    const [detailed, setDetailed] = useState(null)
    const [activeChart, setActiveChart] = useState('revenue')

    useEffect(() => {
        apiFetch('/admin/analytics').then(setAnalytics).catch(() => showToast('Error loading analytics'))
        apiFetch('/admin/analytics/detailed').then(setDetailed).catch(() => {})
    }, [showToast])

    const a = analytics || {}
    const d = detailed || {}

    const revenueData = d.revenueByPlan || a.revenueByPlan || [
        { name: 'Starter', value: 40, color: '#60a5fa' },
        { name: 'Pro', value: 35, color: 'var(--power-500)' },
        { name: 'Elite', value: 25, color: '#a78bfa' },
    ]

    const growthData = d.userGrowth || a.userGrowth || { months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], values: [120, 180, 240, 310, 390, 480] }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><BarChart3 size={24} /> Analytics</h1>
                <div className="ad-chart-tabs">
                    {['Revenue', 'Users', 'Growth'].map(tab => (
                        <button key={tab} className={'ad-chart-tab' + (activeChart === tab.toLowerCase() ? ' ad-tab-active' : '')} onClick={() => setActiveChart(tab.toLowerCase())}>{tab}</button>
                    ))}
                </div>
            </div>
            <div className="ad-kpi-grid" style={{ padding: '0 24px' }}>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-green"><DollarSign /></div><div className="ad-kpi-value">${(a.mrr || 0).toLocaleString()}</div><div className="ad-kpi-label">MRR</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-blue"><DollarSign /></div><div className="ad-kpi-value">${(a.arr || a.mrr * 12 || 0).toLocaleString()}</div><div className="ad-kpi-label">ARR</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-yellow"><TrendingUp /></div><div className="ad-kpi-value">{a.churnRate || 0}%</div><div className="ad-kpi-label">Churn Rate</div></div>
                <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-purple"><Target /></div><div className="ad-kpi-value">${(a.ltv || 0).toLocaleString()}</div><div className="ad-kpi-label">LTV</div></div>
            </div>
            <div className="ad-section-grid ad-section-grid-2" style={{ padding: '24px' }}>
                <div className="ad-dash-card">
                    <h3 className="ad-section-title-sm">Revenue by Plan</h3>
                    <div style={{ marginTop: 24 }}>
                        {revenueData.map(item => (
                            <div key={item.name} style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                    <span style={{ color: '#d4d4d4' }}>{item.name}</span>
                                    <span style={{ color: '#fff', fontWeight: 600 }}>${(item.value * 1000).toLocaleString()}</span>
                                </div>
                                <div className="ad-tier-bar"><div className="ad-tier-fill" style={{ width: item.value + '%', background: item.color }} /></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="ad-dash-card">
                    <h3 className="ad-section-title-sm">User Growth</h3>
                    <div className="ad-bar-chart" style={{ marginTop: 24 }}>
                        {growthData.months.map((m, i) => (
                            <div key={m} className="ad-bar-col">
                                <span className="ad-bar-label">{m}</span>
                                <div className="ad-bar-fill ad-bar-blue" style={{ height: ((growthData.values[i] || 0) / Math.max(...growthData.values) * 100) + '%' }} />
                                <span className="ad-bar-value">{growthData.values[i]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="ad-dash-card" style={{ margin: '0 24px 24px' }}>
                <h3 className="ad-section-title-sm">Total Revenue</h3>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--power-500)', marginTop: 8 }}>
                    ${(a.totalRevenue || 0).toLocaleString()}
                </div>
            </div>
        </div>
    )
}
