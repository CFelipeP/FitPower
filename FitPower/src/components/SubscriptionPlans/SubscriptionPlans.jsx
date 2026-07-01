import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, Loader2, Crown, AlertCircle, ArrowLeftRight } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import PayPalSubscribeButton from '../Pricing/PayPalSubscribeButton'
import './SubscriptionPlans.css'

export default function SubscriptionPlans({ standalone = false }) {
    const [isYearly, setIsYearly] = useState(false)
    const [plans, setPlans] = useState([])
    const [subscription, setSubscription] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [subscribing, setSubscribing] = useState(null)
    const [cancelling, setCancelling] = useState(false)
    const navigate = useNavigate()
    const { showToast } = useToast()
    const { isAuthenticated } = useAuth()

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        Promise.all([
            apiFetch('/plans'),
            isAuthenticated ? apiFetch('/subscriptions').catch(() => null) : Promise.resolve(null)
        ])
            .then(([plansData, subData]) => {
                if (cancelled) return
                setPlans(Array.isArray(plansData) ? plansData : [])
                if (subData) setSubscription(subData)
            })
            .catch(err => { if (!cancelled) setError(err.message) })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [isAuthenticated])

    const handleSubscribe = async (planId) => {
        if (!isAuthenticated) {
            navigate('/login')
            return
        }
        setSubscribing(planId)
        try {
            const data = await apiFetch('/stripe/create-checkout', {
                method: 'POST',
                body: JSON.stringify({ plan_id: planId, billing: isYearly ? 'yearly' : 'monthly' })
            })
            if (data.url) {
                window.location.assign(data.url)
            } else {
                showToast('Could not create checkout session')
            }
        } catch (err) {
            showToast(err.message || 'Failed to start checkout')
        } finally {
            setSubscribing(null)
        }
    }

    const handleCancel = async () => {
        setCancelling(true)
        try {
            await apiFetch('/stripe/cancel-subscription', { method: 'POST' })
            setSubscription(null)
            showToast('Subscription cancelled')
        } catch (err) {
            showToast(err.message || 'Failed to cancel')
        } finally {
            setCancelling(false)
        }
    }

    const handleSwitch = async (planId) => {
        setSubscribing(planId)
        try {
            const data = await apiFetch('/stripe/create-checkout', {
                method: 'POST',
                body: JSON.stringify({ plan_id: planId, billing: isYearly ? 'yearly' : 'monthly' })
            })
            if (data.url) {
                window.location.assign(data.url)
            } else {
                showToast('Could not create checkout session')
            }
        } catch (err) {
            showToast(err.message || 'Failed to switch plan')
        } finally {
            setSubscribing(null)
        }
    }

    const activePlanId = subscription?.plan_id || subscription?.plan?.id || null
    const activePlanName = subscription?.plan?.name || subscription?.plan_name || 'Active Plan'
    const isActive = activePlanId !== null

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
            {isActive && (
                <div className="sp-current-banner">
                    <div className="sp-current-badge">
                        <Crown size={18} />
                        <span>Current Plan: {activePlanName}</span>
                    </div>
                    {subscription?.cancel_at_period_end ? (
                        <span className="sp-cancels-at">Cancels at period end</span>
                    ) : (
                        <button
                            className="sp-cancel-btn"
                            onClick={handleCancel}
                            disabled={cancelling}
                        >
                            {cancelling ? <Loader2 size={14} className="spin" /> : null}
                            Cancel Subscription
                        </button>
                    )}
                </div>
            )}

            <div className="sp-billing-toggle-wrapper">
                <span className={`sp-toggle-label ${!isYearly ? 'active' : ''}`}>Monthly</span>
                <button className="sp-billing-toggle" onClick={() => setIsYearly(!isYearly)} aria-label="Toggle billing cycle">
                    <div className="sp-toggle-dot" style={{ transform: isYearly ? 'translateX(28px)' : 'translateX(0)' }} />
                </button>
                <span className={`sp-toggle-label ${isYearly ? 'active' : ''}`}>
                    Annual <span className="sp-discount">Save 20%</span>
                </span>
            </div>

            <div className="sp-grid">
                {plans.map((plan, i) => {
                    const isCurrent = activePlanId === plan.id
                    const planPrice = isYearly ? plan.price?.yearly : plan.price?.monthly

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
                                {planPrice && <span className="sp-price-period">/mo</span>}
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
                                    onClick={() => isCurrent ? null : isActive ? handleSwitch(plan.id) : handleSubscribe(plan.id)}
                                    disabled={subscribing === plan.id || isCurrent}
                                >
                                    {subscribing === plan.id ? (
                                        <><Loader2 size={16} className="spin" /> Processing…</>
                                    ) : isCurrent ? (
                                        <>Current Plan</>
                                    ) : isActive ? (
                                        <><ArrowLeftRight size={16} /> Switch to {plan.name}</>
                                    ) : (
                                        <>💳 Subscribe</>
                                    )}
                                </button>
                                {!isCurrent && (
                                    <PayPalSubscribeButton
                                        planId={plan.id}
                                        billing={isYearly ? 'yearly' : 'monthly'}
                                        onSuccess={() => window.location.href = '/payment/success'}
                                    />
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
