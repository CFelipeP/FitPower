import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Check, Crown, Loader2, ArrowLeft, Shield } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import WalletCheckout from '../Pricing/WalletCheckout'
import './CheckoutPage.css'

export default function CheckoutPage() {
    const [searchParams] = useSearchParams()
    const planId = searchParams.get('plan_id')
    const billing = searchParams.get('billing') || 'monthly'
    const [plan, setPlan] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!planId) {
            setError('No plan selected')
            setLoading(false)
            return
        }
        apiFetch('/plans')
            .then(plans => {
                const found = (plans || []).find(p => p.id === planId || p.id === parseInt(planId))
                if (!found) {
                    setError('Plan not found')
                    return
                }
                setPlan(found)
            })
            .catch(() => setError('Error loading plan'))
            .finally(() => setLoading(false))
    }, [planId])

    const price = plan
        ? billing === 'yearly'
            ? plan.price?.yearly || plan.price_yearly
            : plan.price?.monthly || plan.price_monthly
        : null

    if (loading) {
        return (
            <div className="co-loading">
                <Loader2 size={32} className="spin" />
                <span>Loading checkout...</span>
            </div>
        )
    }

    if (error || !plan) {
        return (
            <div className="co-error">
                <h2>{error || 'Plan not found'}</h2>
                <Link to="/plans" className="co-btn co-btn-secondary">← Back to plans</Link>
            </div>
        )
    }

    return (
        <div className="co-page">
            <div className="co-container">
                <Link to="/plans" className="co-back-link">
                    <ArrowLeft size={16} /> Back to plans
                </Link>

                <div className="co-grid">
                    <div className="co-main">
                        <div className="co-card">
                            <div className="co-header">
                                <div className="co-icon-box"><Crown size={24} /></div>
                                <div>
                                    <h1 className="co-title">Complete your purchase</h1>
                                    <p className="co-subtitle">{plan.name} — {billing === 'yearly' ? 'Annual' : 'Monthly'} billing</p>
                                </div>
                            </div>

                            <div className="co-plan-summary">
                                <div className="co-plan-name">{plan.name}</div>
                                <div className="co-plan-price">
                                    <span className="co-price-value">{price}</span>
                                    <span className="co-price-period">/{billing === 'yearly' ? 'year' : 'month'}</span>
                                </div>
                                <p className="co-plan-desc">{plan.description}</p>
                            </div>

                            <div className="co-features">
                                <div className="co-features-title">What's included:</div>
                                {(plan.features || []).map((f, i) => (
                                    <div key={i} className="co-feature-row">
                                        <Check size={16} className="co-check" />
                                        <span className={!f.included ? 'co-dim' : ''}>{f.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="co-sidebar">
                        <div className="co-card co-payment-card">
                            <h3 className="co-sidebar-title">Pay with Virtual Wallet</h3>
                            <div className="co-order-summary">
                                <div className="co-order-row">
                                    <span>{plan.name} ({billing === 'yearly' ? 'Annual' : 'Monthly'})</span>
                                    <span className="co-order-price">{price}</span>
                                </div>
                                <div className="co-order-divider" />
                                <div className="co-order-row co-order-total">
                                    <span>Total</span>
                                    <span className="co-total-price">{price}</span>
                                </div>
                            </div>

                            <WalletCheckout
                                amount={price}
                                description={`${plan.name} - ${billing === 'yearly' ? 'Annual' : 'Monthly'}`}
                                planId={plan.id}
                                billing={billing}
                                onSuccess={(res) => {
                                    const params = new URLSearchParams({
                                        plan_name: plan.name,
                                        billing,
                                        amount: price,
                                        ...(res?.subscriptionId ? { subscription_id: res.subscriptionId } : {}),
                                    })
                                    window.location.href = `/payment/success?${params}`
                                }}
                            />

                            <div className="co-secure">
                                <Shield size={14} />
                                <span>Secure payment</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
