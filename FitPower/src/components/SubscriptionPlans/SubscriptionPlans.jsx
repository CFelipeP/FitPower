import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, Loader2, Crown, AlertCircle, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import { swalError } from '../../lib/alerts'
import './SubscriptionPlans.css'

const CANCEL_REASONS = [
    'Too expensive',
    'No longer need it',
    'Found an alternative',
    'Not satisfied with my coach',
    'Taking a break',
    'Other',
]

export default function SubscriptionPlans({ standalone = false }) {
    const [isYearly, setIsYearly] = useState(false)
    const [plans, setPlans] = useState([])
    const [subscription, setSubscription] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [cancelling, setCancelling] = useState(false)
    const [cancelModal, setCancelModal] = useState(false)
    const [cancelReason, setCancelReason] = useState('')
    const [cancelDone, setCancelDone] = useState(null)
    const [reactivating, setReactivating] = useState(false)
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()

    const loadData = () => {
        setLoading(true)
        Promise.all([
            apiFetch('/plans'),
            isAuthenticated ? apiFetch('/subscriptions').catch(() => null) : Promise.resolve(null),
        ])
            .then(([plansData, subData]) => {
                setPlans(Array.isArray(plansData) ? plansData : [])
                if (subData) setSubscription(subData)
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }

    useEffect(() => { loadData() }, [isAuthenticated])

    const handleSubscribe = (planId) => {
        if (!isAuthenticated) {
            navigate('/login')
            return
        }
        navigate(`/checkout?plan_id=${planId}&billing=${isYearly ? 'yearly' : 'monthly'}`)
    }

    const handleCancel = async () => {
        setCancelling(true)
        try {
            const res = await apiFetch('/subscriptions/cancel', {
                method: 'POST',
                body: JSON.stringify({ reason: cancelReason || null }),
            })
            setCancelModal(false)
            setCancelDone(res)
            loadData()
        } catch (err) {
            swalError(err.message || 'Failed to cancel')
        } finally {
            setCancelling(false)
        }
    }

    const handleReactivate = async () => {
        setReactivating(true)
        try {
            await apiFetch('/subscriptions/reactivate', { method: 'POST', body: JSON.stringify({}) })
            loadData()
        } catch (err) {
            swalError(err.message || 'Could not reactivate')
        } finally {
            setReactivating(false)
        }
    }

    const handlePortal = async () => {
        try {
            const res = await apiFetch('/stripe/portal')
            if (res?.url) window.location.href = res.url
        } catch (err) {
            swalError(err.message || 'Could not open the billing portal')
        }
    }

    const handleSwitch = (planId) => {
        navigate(`/checkout?plan_id=${planId}&billing=${isYearly ? 'yearly' : 'monthly'}`)
    }

    const activePlanId = subscription?.planId || subscription?.plan_id || subscription?.plan?.id || null
    const activePlanName = subscription?.planName || subscription?.plan?.name || subscription?.plan_name || 'Active Plan'
    const status = subscription?.status || null
    const subBilling = subscription?.billing || subscription?.billing_cycle || null
    const hasPlan = activePlanId !== null && ['active', 'pending_cancel', 'payment_failed', 'suspended'].includes(status)
    const endsAt = subscription?.endsAt ? new Date(subscription.endsAt).toLocaleDateString() : null

    if (loading) {
        return (
            <div className="sp-loading">
                <Loader2 size={32} className="spin" />
                <span>Loading plans…</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="sp-error">
                <AlertCircle size={24} />
                <p>{error}</p>
                <button className="sp-btn sp-btn-secondary" onClick={() => window.location.reload()}>Retry</button>
            </div>
        )
    }

    return (
        <div className={`sp-container ${standalone ? 'sp-standalone' : ''}`}>
            {hasPlan && status === 'pending_cancel' && (
                <div className="sp-status-banner sp-banner-warn">
                    <AlertCircle size={18} />
                    <div className="sp-status-info">
                        <strong>Your plan will be cancelled{endsAt ? ` on ${endsAt}` : ''}.</strong>
                        <span>Your data is preserved. Reactivate anytime before the period ends.</span>
                    </div>
                    <button className="sp-btn sp-btn-primary" onClick={handleReactivate} disabled={reactivating}>
                        {reactivating ? <Loader2 size={14} className="spin" /> : null} Reactivate
                    </button>
                </div>
            )}

            {hasPlan && (status === 'payment_failed' || status === 'suspended') && (
                <div className="sp-status-banner sp-banner-danger">
                    <AlertCircle size={18} />
                    <div className="sp-status-info">
                        <strong>{status === 'suspended' ? 'Your access is suspended.' : 'Your payment failed.'}</strong>
                        <span>Update your payment method to restore access. Your data is fully preserved.</span>
                    </div>
                    <button className="sp-btn sp-btn-primary" onClick={handlePortal}>Update payment method</button>
                </div>
            )}

            {cancelDone && !hasPlan && (
                <div className="sp-status-banner sp-banner-ok">
                    <Check size={18} />
                    <div className="sp-status-info">
                        <strong>{cancelDone.message}</strong>
                        <span>Your history, goals and achievements are preserved if you decide to come back.</span>
                    </div>
                </div>
            )}

            {hasPlan && status === 'active' && (
                <div className="sp-current-banner">
                    <div className="sp-current-badge">
                        <Crown size={18} />
                        <span>Current Plan: {activePlanName}</span>
                        {endsAt && <span className="sp-renews"> · Renews {endsAt}</span>}
                    </div>
                    <button
                        className="sp-cancel-btn"
                        onClick={() => setCancelModal(true)}
                        disabled={cancelling}
                    >
                        {cancelling ? <Loader2 size={14} className="spin" /> : null}
                        Cancel Subscription
                    </button>
                </div>
            )}

            <div className="sp-billing-toggle-wrapper">
                <span className={`sp-toggle-label ${!isYearly ? 'active' : ''}`}>Monthly</span>
                <button className="sp-billing-toggle" onClick={() => setIsYearly(!isYearly)} aria-label="Toggle billing cycle">
                    <div className="sp-toggle-dot" style={{ transform: isYearly ? 'translateX(28px)' : 'translateX(0)' }} />
                </button>
                <span className={`sp-toggle-label ${isYearly ? 'active' : ''}`}>
                    Annual <span className="sp-discount">2 months free</span>
                </span>
            </div>

            <div className="sp-grid">
                {plans.map((plan, i) => {
                    const viewBilling = isYearly ? 'yearly' : 'monthly'
                    // A plan is "current" ONLY when both the plan id AND the
                    // billing cycle on the toggle match your real subscription.
                    // Otherwise monthly and annual get mixed up (e.g. an annual
                    // $150 card marked "Current Plan" when you only paid $15/mo).
                    const isCurrent = activePlanId === plan.id && status === 'active' && (subBilling === null || subBilling === viewBilling)
                    const rawPrice = isYearly ? plan.price?.yearly : plan.price?.monthly
                    const planPrice = rawPrice != null && rawPrice !== '' ? `$${Number(String(rawPrice).replace(/[^0-9.]/g, '')).toLocaleString('en-US', { minimumFractionDigits: Number(String(rawPrice).replace(/[^0-9.]/g, '')) % 1 !== 0 ? 2 : 0 })}` : null

                    return (
                        <div
                            key={plan.id}
                            className={`sp-card ${plan.popular ? 'sp-popular' : ''} ${isCurrent ? 'sp-current' : ''}`}
                            style={{ transitionDelay: `${i * 0.1}s` }}
                        >
                            {plan.popular && <div className="sp-popular-badge">Most Popular</div>}
                            {isCurrent && <div className="sp-current-badge-inline">Current Plan</div>}

                            <div className="sp-card-header">
                                <h3 className="sp-plan-name">{plan.name}</h3>
                                <p className="sp-plan-desc">{plan.description}</p>
                            </div>

                            <div className="sp-plan-price">
                                <span className={`sp-price-value ${plan.popular ? 'sp-text-power' : ''}`}>
                                    {planPrice || 'Free'}
                                </span>
                                {planPrice && <span className="sp-price-period">/{isYearly ? 'yr' : 'mo'}</span>}
                            </div>

                            <ul className="sp-features">
                                {(plan.features || []).map((f, j) => (
                                    <li key={j} className={!f.included ? 'sp-feature-disabled' : ''}>
                                        {f.included ? <Check size={16} className="sp-text-power" /> : <X size={16} />}
                                        {f.text}
                                    </li>
                                ))}
                            </ul>

                            <div className="sp-actions">
                                <button
                                    className={`sp-btn ${plan.popular ? 'sp-btn-primary' : 'sp-btn-secondary'}`}
                                    onClick={() => isCurrent ? null : hasPlan ? handleSwitch(plan.id) : handleSubscribe(plan.id)}
                                    disabled={isCurrent}
                                >
                                    {isCurrent ? (
                                        <>Current Plan</>
                                    ) : hasPlan ? (
                                        <><ArrowLeftRight size={16} /> Switch to {plan.name}</>
                                    ) : (
                                        <>💳 Subscribe</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {cancelModal && (
                <div className="sp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCancelModal(false) }}>
                    <div className="sp-modal">
                        <h3 className="sp-modal-title">Before you go…</h3>
                        <p className="sp-modal-sub">
                            You can pause by keeping your plan, or downgrade to Starter to keep tracking for less.
                        </p>
                        <div className="sp-modal-reason">
                            <label className="sp-modal-label">Why are you leaving? (optional)</label>
                            <select className="sp-modal-select" value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
                                <option value="">Select a reason…</option>
                                {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="sp-modal-actions">
                            <button className="sp-btn sp-btn-primary" onClick={() => setCancelModal(false)}>Keep my plan</button>
                            <button className="sp-btn sp-btn-secondary" onClick={() => { setCancelModal(false); handleSwitch(plans[0]?.id) }}>
                                Switch to {plans[0]?.name || 'Starter'}
                            </button>
                        </div>
                        <p className="sp-modal-hint">
                            Cancelling keeps your access until the end of the current period and preserves all your data.
                        </p>
                        <button className="sp-cancel-confirm" onClick={handleCancel} disabled={cancelling}>
                            {cancelling ? <Loader2 size={14} className="spin" /> : null} Cancel anyway
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
