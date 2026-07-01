import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Check, Loader } from 'lucide-react'
import PayPalSubscribeButton from './PayPalSubscribeButton'

export default function PricingPlans() {
    const { showToast } = useToast()
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [billing, setBilling] = useState('monthly')
    const [purchasing, setPurchasing] = useState(null)

    useEffect(() => {
        apiFetch('/plans').then(setPlans).catch(() => {}).finally(() => setLoading(false))
    }, [])

    const handleSelectPlan = async (planId) => {
        setPurchasing(planId)
        try {
            const res = await apiFetch('/stripe/create-checkout', {
                method: 'POST',
                body: JSON.stringify({ plan_id: planId, billing })
            })
            if (res.url && res.url.startsWith('https://')) {
                window.location.assign(res.url)
            } else {
                showToast('Invalid redirect URL')
            }
        } catch (e) {
            showToast(e.message || 'Error processing payment')
        } finally {
            setPurchasing(null)
        }
    }

    if (loading) return <div className="pricing-loading"><div className="skeleton-pulse" style={{height: 400}}></div></div>

    return (
        <div className="pricing-section">
            <div className="pricing-toggle">
                <button className={`pricing-toggle-btn ${billing === 'monthly' ? 'active' : ''}`} onClick={() => setBilling('monthly')}>Monthly</button>
                <button className={`pricing-toggle-btn ${billing === 'yearly' ? 'active' : ''}`} onClick={() => setBilling('yearly')}>Yearly</button>
            </div>
            <div className="pricing-grid">
                {plans.map(plan => (
                    <div key={plan.id} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                        {plan.popular && <div className="pricing-card-badge">Most Popular</div>}
                        <h3 className="pricing-card-name">{plan.name}</h3>
                        <div className="pricing-card-price">
                            <span className="pricing-price-value">${billing === 'yearly' ? plan.price_yearly : plan.price_monthly}</span>
                            <span className="pricing-price-period">/{billing === 'yearly' ? 'year' : 'month'}</span>
                        </div>
                        {billing === 'yearly' && plan.price_monthly && (
                            <div className="pricing-card-save">
                                Save ${Math.round((plan.price_monthly * 12) - plan.price_yearly)}/year
                            </div>
                        )}
                        <div className="pricing-card-actions">
                            <button
                                className="pricing-card-btn"
                                onClick={() => handleSelectPlan(plan.id)}
                                disabled={purchasing === plan.id}
                            >
                                {purchasing === plan.id ? <Loader size={16} className="spin" /> : 'Subscribe'}
                            </button>
                            <PayPalSubscribeButton
                                planId={plan.id}
                                billing={billing}
                                onSuccess={() => window.location.href = '/payment/success'}
                            />
                        </div>
                        <ul className="pricing-card-features">
                            {(plan.features || []).map((f, i) => (
                                <li key={i} className="pricing-card-feature">
                                    <Check size={14} className="pricing-check" />
                                    <span>{f.name || f}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    )
}
