import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, Loader2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/I18nContext'
import { apiFetch } from '../../lib/api'
import PayPalSubscribeButton from './PayPalSubscribeButton'
import './Pricing.css'

export default function Pricing() {
    const [isYearly, setIsYearly] = useState(false)
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [subscribing, setSubscribing] = useState(null)
    const sectionRef = useRef(null)
    const navigate = useNavigate()
    const { showToast } = useToast()
    const { isAuthenticated } = useAuth()
    const { t } = useI18n()

    useEffect(() => {
        if (!loading && sectionRef.current) {
            const els = sectionRef.current.querySelectorAll('.reveal')
            els.forEach(el => el.classList.add('active'))
        }
    }, [loading])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        apiFetch('/plans')
            .then(data => { if (!cancelled) setPlans(data || []) })
            .catch(err => { if (!cancelled) setError(err.message) })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [])

    return (
        <section id="pricing" className="section pricing-section" ref={sectionRef}>
            <div className="pricing-line-top"></div>
            <div className="container">
                <div className="text-center reveal section-intro">
                    <div className="section-header center">
                        <div className="section-header-line"></div>
                        <span className="section-header-label">{t('pricing.label')}</span>
                        <div className="section-header-line"></div>
                    </div>
                    <h2 className="section-title" style={{ marginBottom: '24px' }}>{t('pricing.title')}</h2>
                    <p className="features-subtitle">{t('pricing.subtitle')}</p>

                    <div className="billing-toggle-wrapper">
                        <span className={`toggle-label ${!isYearly ? 'active' : ''}`}>{t('pricing.monthly')}</span>
                        <button className="billing-toggle" onClick={() => setIsYearly(!isYearly)} aria-label="Toggle billing cycle">
                            <div className="toggle-dot" style={{ transform: isYearly ? 'translateX(28px)' : 'translateX(0)' }}></div>
                        </button>
                        <span className={`toggle-label ${isYearly ? 'active' : ''}`}>{t('pricing.annual')} <span className="discount">{t('pricing.discount')}</span></span>
                    </div>
                </div>

                {loading ? (
                    <div className="pricing-loading">
                        <Loader2 size={32} className="spin" />
                        <span>{t('common.loading')}</span>
                    </div>
                ) : error ? (
                    <div className="pricing-error">
                        <p>{t('common.error')}</p>
                        <button className="btn-secondary" onClick={() => window.location.reload()}>{t('common.retry')}</button>
                    </div>
                ) : (
                    <div className="pricing-grid">
                        {plans.map((plan, i) => (
                            <div key={plan.id} className={`reveal card-hover pricing-card ${plan.popular ? 'popular' : ''}`} style={{ transitionDelay: `${i * 0.1}s` }}>
                                {plan.popular && <div className="popular-badge">{t('pricing.mostPopular')}</div>}
                                <div className="pricing-header">
                                    <h3 className="pricing-name">{plan.name}</h3>
                                    <p className="pricing-desc">{plan.description}</p>
                                </div>
                                <div className="pricing-price">
                                    <span className={plan.popular ? 'text-power' : ''}>{isYearly ? plan.price?.yearly : plan.price?.monthly}</span>
                                    <span className="pricing-period">{t('pricing.perMonth')}</span>
                                </div>
                                <ul className="pricing-features">
                                    {(plan.features || []).map((f, j) => (
                                        <li key={j} className={!f.included ? 'disabled' : ''}>
                                            {f.included ? <Check size={16} className="text-power" /> : <X size={16} />}
                                            {f.text}
                                        </li>
                                    ))}
                                </ul>
                                <div className="pricing-actions">
                                    <button
                                        className={`pricing-btn btn-shine ${plan.popular ? 'primary' : 'secondary'}`}
                                        onClick={async () => {
                                            if (!isAuthenticated) {
                                                navigate('/register')
                                                return
                                            }
                                            setSubscribing(plan.id)
                                            try {
                                                const data = await apiFetch('/stripe/create-checkout', {
                                                    method: 'POST',
                                                    body: JSON.stringify({ plan_id: plan.id, billing: isYearly ? 'yearly' : 'monthly' })
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
                                        }}
                                        disabled={subscribing === plan.id}
                                    >
                                        {subscribing === plan.id ? (
                                            <><Loader2 size={16} className="spin" /> Processing…</>
                                        ) : (
                                            <>💳 {t('pricing.startFree')}</>
                                        )}
                                    </button>
                                    <PayPalSubscribeButton
                                        planId={plan.id}
                                        billing={isYearly ? 'yearly' : 'monthly'}
                                        onSuccess={() => window.location.href = '/payment/success'}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
