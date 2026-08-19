import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { confirmSwal, swalError } from '../../lib/alerts'
import { DollarSign, TrendingUp, AlertCircle, Receipt, ChevronLeft, ChevronRight, Undo2, Loader2 } from 'lucide-react'
import Avatar from '../Avatar/Avatar'

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'pending', label: 'Pending' },
]

const METHOD_OPTIONS = [
    { value: '', label: 'All methods' },
    { value: 'card', label: 'Card' },
    { value: 'paypal', label: 'PayPal' },
]

export default function AdminPayments() {
    const { showToast } = useToast()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState('')
    const [method, setMethod] = useState('')
    const [search, setSearch] = useState('')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [refunding, setRefunding] = useState(null)
    const debounceRef = useRef(null)

    const fetchPayments = useCallback((p = 1) => {
        setLoading(true)
        const params = new URLSearchParams({ page: p, perPage: 25 })
        if (status) params.set('status', status)
        if (method) params.set('method', method)
        if (search.trim()) params.set('search', search.trim())
        if (from) params.set('from', from)
        if (to) params.set('to', to)
        apiFetch(`/admin/payments?${params}`)
            .then(setData)
            .catch(() => swalError('Error loading payments'))
            .finally(() => setLoading(false))
    }, [status, method, search, from, to])

    useEffect(() => { fetchPayments(1) }, [fetchPayments])

    const handleSearchChange = (value) => {
        setSearch(value)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => setPage(1), 400)
    }

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

    const goTo = (p) => {
        setPage(p)
        fetchPayments(p)
    }

    const handleRefund = async (payment) => {
        const amount = Number.isFinite(parseFloat(payment.amount)) ? parseFloat(payment.amount).toFixed(2) : '0.00'
        const ok = await confirmSwal(
            `Refund $${amount} (PayPal) from ${payment.userName}? The money is returned to the customer.`,
            'Refund this payment?',
            { confirmText: 'Refund', cancelText: 'Cancel' }
        )
        if (!ok) return
        setRefunding(payment.id)
        try {
            await apiFetch(`/admin/payments/${payment.id}/refund`, { method: 'POST', body: JSON.stringify({}) })
            showToast('Refund processed via PayPal')
            fetchPayments(page)
        } catch (e) {
            swalError(e.message || 'Could not refund the payment')
        } finally {
            setRefunding(null)
        }
    }

    const statusBadge = (s) => {
        const map = {
            completed: 'ad-status-active',
            failed: 'ad-status-cancelled',
            refunded: 'ad-status-pending',
            pending: 'ad-status-pending',
        }
        return map[s] || 'ad-status-pending'
    }

    const totals = data?.totals || { collectedAll: 0, collectedMonth: 0, failedAll: 0, totalRows: 0 }
    const payments = data?.payments || []
    const fmtAmount = (p) => {
        const n = parseFloat(p.amount)
        return Number.isFinite(n) ? n.toFixed(2) : '0.00'
    }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><DollarSign size={24} /> Payments</h1>
                <div className="ad-content-actions">
                    <input
                        className="ad-content-search"
                        placeholder="Search user, email or invoice..."
                        aria-label="Search payments"
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                    />
                    <select className="ad-filter-select" aria-label="Filter by status" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select className="ad-filter-select" aria-label="Filter by payment method" value={method} onChange={e => { setMethod(e.target.value); setPage(1) }}>
                        {METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input className="ad-date-input" type="date" aria-label="From date" value={from} onChange={e => setFrom(e.target.value)} title="From" />
                    <input className="ad-date-input" type="date" aria-label="To date" value={to} onChange={e => setTo(e.target.value)} title="To" />
                </div>
            </div>

            <div className="ad-kpi-grid">
                <div className="ad-dash-card ad-kpi-card">
                    <div className="ad-kpi-icon-box ad-green"><DollarSign /></div>
                    <div className="ad-kpi-value">${totals.collectedAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="ad-kpi-label">Total collected</div>
                </div>
                <div className="ad-dash-card ad-kpi-card">
                    <div className="ad-kpi-icon-box ad-blue"><TrendingUp /></div>
                    <div className="ad-kpi-value">${totals.collectedMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="ad-kpi-label">Collected this month</div>
                </div>
                <div className="ad-dash-card ad-kpi-card">
                    <div className="ad-kpi-icon-box ad-red"><AlertCircle /></div>
                    <div className="ad-kpi-value ad-kpi-red">${totals.failedAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="ad-kpi-label">Failed payments</div>
                </div>
                <div className="ad-dash-card ad-kpi-card">
                    <div className="ad-kpi-icon-box ad-purple"><Receipt /></div>
                    <div className="ad-kpi-value">{totals.totalRows.toLocaleString()}</div>
                    <div className="ad-kpi-label">Transactions</div>
                </div>
            </div>

            <div className="ad-dash-card" style={{ margin: '24px' }}>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading payments...</div>
                ) : payments.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No payments found{search || status || method ? ' for these filters' : ' yet — payments appear here as soon as customers pay'}.
                    </div>
                ) : (
                    <div className="ad-table-wrap">
                        <table className="ad-table ad-payments-table">
                            <thead>
                                <tr>
                                    <th scope="col">Date</th>
                                    <th scope="col">User</th>
                                    <th scope="col">Plan</th>
                                    <th scope="col">Amount</th>
                                    <th scope="col">Method</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Reference</th>
                                    <th scope="col" style={{ width: 90 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map(p => (
                                    <tr key={p.id} className="ad-user-row">
                                        <td><span className="ad-time">{new Date(p.createdAt).toLocaleString()}</span></td>
                                        <td>
                                            <div className="ad-user-cell">
                                                <Avatar name={p.userName} src={null} size={34} className="ad-user-avatar" />
                                                <div className="ad-user-cell-info">
                                                    <div>{p.userName || 'Unknown'}</div>
                                                    <div>{p.userEmail}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{p.planName || '—'}</td>
                                        <td style={{ fontWeight: 700, color: p.status === 'failed' ? '#f87171' : '#4ade80' }}>
                                            {p.status === 'failed' ? '−' : ''}${fmtAmount(p)} {p.currency && p.currency !== 'USD' ? p.currency : ''}
                                        </td>
                                        <td>
                                            <span className={`ad-tier-label ${p.method === 'paypal' ? 'ad-tier-elite' : 'ad-tier-pro'}`}>
                                                {p.method === 'paypal' ? 'PayPal' : p.method || '—'}
                                            </span>
                                        </td>
                                        <td><span className={`ad-status-badge ${statusBadge(p.status)}`}><span className="ad-status-dot" />{p.status}</span></td>
                                        <td><span className="ad-time">{p.stripeInvoiceId || p.paypalCaptureId || '—'}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {p.subscriptionId && p.status === 'completed' && (
                                                    <a
                                                        className="ad-btn ad-btn-secondary ad-btn-xs"
                                                        href={`/api/subscriptions/${p.subscriptionId}/invoice`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="View receipt"
                                                        aria-label="View receipt"
                                                    >
                                                        <Receipt size={12} />
                                                    </a>
                                                )}
                                                {p.status === 'completed' && p.method === 'paypal' && (
                                                    <button
                                                        className="ad-btn ad-btn-secondary ad-btn-xs"
                                                        onClick={() => handleRefund(p)}
                                                        disabled={refunding === p.id}
                                                        title="Refund via PayPal"
                                                        aria-label={`Refund $${fmtAmount(p)} via PayPal`}
                                                    >
                                                        {refunding === p.id ? <Loader2 size={12} className="spin" /> : <Undo2 size={12} />}
                                                    </button>
                                                )}
                                                {p.status === 'completed' && p.method !== 'paypal' && (
                                                    <span className="ad-time" title="Card refunds must be done in the Stripe dashboard">Card refunds: use Stripe dashboard</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {data && data.totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, alignItems: 'center' }}>
                        <button className="ad-btn ad-btn-secondary ad-btn-xs" disabled={page <= 1} onClick={() => goTo(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Page {page} of {data.totalPages}</span>
                        <button className="ad-btn ad-btn-secondary ad-btn-xs" disabled={page >= data.totalPages} onClick={() => goTo(page + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
                    </div>
                )}
            </div>
        </div>
    )
}
