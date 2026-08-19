import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { swalError } from '../../lib/alerts'
import { useToast } from '../../context/ToastContext'
import { Wallet, DollarSign, TrendingUp, Clock, Download, CreditCard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import './CoachEarningsPanel.css'

export default function CoachEarningsPanel({ dashboardData }) {
    const { showToast } = useToast()
    const [earnings, setEarnings] = useState(null)
    const [payouts, setPayouts] = useState([])
    const [connect, setConnect] = useState(null)
    const [payoutAmount, setPayoutAmount] = useState('')
    const [requesting, setRequesting] = useState(false)
    const [connecting, setConnecting] = useState(false)

    const load = () => {
        apiFetch('/coach/earnings?days=90').then(setEarnings).catch(() => {})
        apiFetch('/coach/payouts').then(d => setPayouts(Array.isArray(d) ? d : [])).catch(() => {})
        apiFetch('/coach/connect-status').then(setConnect).catch(() => {})
    }

    useEffect(() => { load() }, [])

    const available = (earnings || []).filter(e => e.status === 'available').reduce((s, e) => s + Number(e.amount), 0)
    const totalEarned = (earnings || []).filter(e => ['available', 'paid'].includes(e.status)).reduce((s, e) => s + Number(e.amount), 0)

    const handleConnect = async () => {
        setConnecting(true)
        try {
            const res = await apiFetch('/coach/connect-stripe', { method: 'POST', body: JSON.stringify({}) })
            if (res?.url) {
                window.location.href = res.url
                return
            }
            swalError('Could not start the bank connection. Please try again.')
        } catch (e) {
            swalError(e.message || 'Could not start the bank connection. Please try again.')
        } finally {
            setConnecting(false)
        }
    }

    const handleRequestPayout = async () => {
        const amount = parseFloat(payoutAmount)
        if (!Number.isFinite(amount) || amount <= 0) {
            swalError('Enter a valid amount')
            return
        }
        if (available > 0 && amount > available) {
            swalError(`You can request up to $${available.toFixed(2)}`)
            return
        }
        if (!connect?.onboardingComplete) {
            swalError('Connect your bank account before requesting a payout')
            return
        }
        setRequesting(true)
        try {
            await apiFetch('/coach/request-payout', { method: 'POST', body: JSON.stringify({ amount }) })
            showToast('Payout requested. An administrator will process it.')
            setPayoutAmount('')
            load()
        } catch (e) {
            swalError(e.message || 'Could not request the payout')
        } finally {
            setRequesting(false)
        }
    }

    const exportEarningsCSV = () => {
        const rows = [['Date', 'Type', 'Amount', 'Status']]
        ;(earnings || []).forEach(e => rows.push([e.createdAt, e.type, e.amount, e.status]))
        const csv = rows.map(r => r.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'earnings.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="cep-wrap">
            <div className="cd-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Wallet size={24} style={{ color: 'var(--power-500)' }} /> Earnings
                </h1>
                <button className="cd-btn cd-btn-secondary cd-btn-sm" onClick={exportEarningsCSV}>
                    <Download size={16} /> Export CSV
                </button>
            </div>

            <div className="cd-grid-3" style={{ marginBottom: 24 }}>
                <div className="cd-card cd-kpi-card"><div className="cd-kpi-icon-box cd-green"><DollarSign /></div><div className="cd-kpi-value">${totalEarned.toFixed(2)}</div><div className="cd-kpi-label">Total Earnings</div></div>
                <div className="cd-card cd-kpi-card"><div className="cd-kpi-icon-box cd-yellow"><TrendingUp /></div><div className="cd-kpi-value">{dashboardData?.earnings?.growth || 'â€”'}</div><div className="cd-kpi-label">Growth MoM</div></div>
                <div className="cd-card cd-kpi-card"><div className="cd-kpi-icon-box cd-blue"><Clock /></div><div className="cd-kpi-value">${available.toFixed(2)}</div><div className="cd-kpi-label">Available Balance</div></div>
            </div>

            <div className="cd-card cep-bank-card">
                <h3 className="cd-section-title-sm">Bank Account</h3>
                {connect === null ? (
                    <p className="cep-note"><Loader2 size={14} className="spin" /> Loading connection status...</p>
                ) : connect.connected && connect.onboardingComplete ? (
                    <p className="cep-note cep-ok"><CheckCircle2 size={14} /> Your bank account is connected. Payouts are processed by the platform.</p>
                ) : connect.connected ? (
                    <p className="cep-note cep-warn"><AlertCircle size={14} /> Your Stripe onboarding is not complete. Finish it to receive payouts.</p>
                ) : (
                    <p className="cep-note"><AlertCircle size={14} /> Connect your bank account to receive payouts.</p>
                )}
                <button className="cd-btn cd-btn-primary cd-btn-sm" onClick={handleConnect} disabled={connecting}>
                    {connecting ? <Loader2 size={14} className="spin" /> : <CreditCard size={16} />}
                    {connect?.connected ? 'Finish / Update bank connection' : 'Connect bank account'}
                </button>
            </div>

            <div className="cd-card cep-payout-card">
                <h3 className="cd-section-title-sm">Request Payout</h3>
                <p className="cep-note">
                    Available: <strong>${available.toFixed(2)}</strong>. Earnings accrue automatically from completed coaching sessions.
                </p>
                <div className="cep-payout-row">
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Amount"
                        value={payoutAmount}
                        onChange={e => setPayoutAmount(e.target.value)}
                        className="cep-input"
                    />
                    <button className="cd-btn cd-btn-primary cd-btn-sm" onClick={handleRequestPayout} disabled={requesting || available <= 0}>
                        {requesting ? <Loader2 size={14} className="spin" /> : <DollarSign size={16} />}
                        Request payout
                    </button>
                </div>
            </div>

            <div className="cd-card" style={{ marginTop: 16 }}>
                <h3 className="cd-section-title-sm">Payout History</h3>
                {payouts.length === 0 ? (
                    <p className="cep-note">No payouts yet. Request your first payout once you have earnings.</p>
                ) : (
                    <div className="cep-table-wrap">
                        <table className="cd-earnings-table" style={{ width: '100%', marginTop: 16 }}>
                            <thead><tr><th style={{ textAlign: 'left', padding: '8px 16px', color: 'var(--text-muted)', fontSize: 12 }}>Date</th><th style={{ textAlign: 'left', padding: '8px 16px', color: 'var(--text-muted)', fontSize: 12 }}>Amount</th><th style={{ textAlign: 'left', padding: '8px 16px', color: 'var(--text-muted)', fontSize: 12 }}>Status</th></tr></thead>
                            <tbody>
                                {payouts.map((p, i) => (
                                    <tr key={p.id || i} className="cd-user-row" style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                                        <td style={{ padding: '12px 16px' }}>{new Date(p.createdAt || p.created_at || 0).toLocaleDateString()}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>${Number(p.amount).toFixed(2)}</td>
                                        <td style={{ padding: '12px 16px' }}><span className={`cd-badge ${p.status === 'paid' ? 'cd-badge-done' : p.status === 'rejected' ? 'cd-badge-missed' : 'cd-badge-pending'}`}>{p.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="cd-card cep-breakdown-card">
                <h3 className="cd-section-title-sm">Recent Earnings</h3>
                {(earnings || []).length === 0 ? (
                    <p className="cep-note">No earnings recorded yet â€” they appear here when you complete coaching sessions.</p>
                ) : (
                    <div className="cep-list">
                        {(earnings || []).slice(0, 15).map((e, i) => (
                            <div key={e.id || i} className="cep-row">
                                <div className="cep-row-info">
                                    <span className="cep-row-desc">{e.description || e.type}</span>
                                    <span className="cep-row-date">{new Date(e.createdAt).toLocaleDateString()}</span>
                                </div>
                                <span className="cep-row-amount">${Number(e.amount).toFixed(2)}</span>
                                <span className={`cd-badge ${e.status === 'available' ? 'cd-badge-pending' : 'cd-badge-done'}`}>{e.status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
