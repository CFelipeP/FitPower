import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Check, Crown, Loader2, ArrowLeft, Shield, Lock, Tag, Wallet, X, RefreshCw } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { swalError } from '../../lib/alerts'
import '../DashboardShared.css'
import './CheckoutPage.css'

export default function CheckoutPage() {
    const [searchParams] = useSearchParams()
    const planId = searchParams.get('plan_id')
    const billing = searchParams.get('billing') || 'monthly'
    const [plan, setPlan] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [processing, setProcessing] = useState(false)
    const [coupon, setCoupon] = useState('')
    const [couponApplied, setCouponApplied] = useState(null)
    const [vw, setVw] = useState(null)
    const [vwCard, setVwCard] = useState({ name: '', cardNum: '', expiration: '', cvv: '' })
    const [vwMsg, setVwMsg] = useState('')
    const [vwPolling, setVwPolling] = useState(false)
    const pollRef = useRef(null)
    const navigate = useNavigate()

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

    const basePrice = plan
        ? billing === 'yearly'
            ? plan.price?.yearly || plan.price_yearly
            : plan.price?.monthly || plan.price_monthly
        : null

    const numericPrice = basePrice ? parseFloat(String(basePrice).replace(/[^0-9.]/g, '')) : 0
    const displayPrice = couponApplied?.discounted_price != null
        ? '$' + parseFloat(couponApplied.discounted_price).toFixed(2)
        : basePrice

    const applyCoupon = async () => {
        const code = coupon.trim()
        if (!code) return
        try {
            const res = await apiFetch('/coupons/validate', {
                method: 'POST',
                body: JSON.stringify({ code, planId: plan.id }),
            })
            setCouponApplied({
                code: res.code,
                discount_pct: res.discount_pct,
                discount_amount: res.discount_amount,
                discounted_price: Math.max(0, numericPrice - (res.discount_amount > 0 ? res.discount_amount : numericPrice * res.discount_pct / 100)),
            })
        } catch (e) {
            setCouponApplied(null)
            swalError(e.message || 'This coupon is not valid for the selected plan.')
        }
    }

    const handlePayPal = async () => {
        if (!plan || processing) return
        setProcessing(true)
        try {
            const res = await apiFetch('/paypal/create-order', {
                method: 'POST',
                body: JSON.stringify({ plan_id: plan.id, billing, coupon_code: couponApplied?.code || undefined }),
            })
            if (res?.orderID) {
                window.location.href = res.approvalUrl || `https://www.sandbox.paypal.com/checkoutnow?token=${res.orderID}`
                return
            }
            swalError('We could not start the payment. No charge was made. Please try again.')
        } catch (e) {
            swalError(e.message || 'We could not start the payment. No charge was made. Please try again.')
        } finally {
            setProcessing(false)
        }
    }

    const stopPolling = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        setVwPolling(false)
    }

    const handleVW = async () => {
        if (!plan || processing || vw) return
        setProcessing(true)
        setVwMsg('')
        try {
            const res = await apiFetch('/vw/checkout', {
                method: 'POST',
                body: JSON.stringify({ plan_id: plan.id, billing, coupon_code: couponApplied?.code || undefined }),
            })
            const demo = !res.qr_code_base64 // provider unavailable / sandbox auto-confirm
            setVw({ intent_id: res.intent_id, amount: res.amount, qr: res.qr_code_base64 || null, demo })
            if (demo) {
                // No real QR from the provider: never auto-confirm. The user must
                // explicitly press "Pay" so we don't fake a payment success.
                setVwMsg('Demo environment — Virtual Wallet is unreachable. No real charge will be made. Press "Pay" to complete (sandbox).')
            } else {
                setVwMsg('Payment pending — scan the QR with Virtual Wallet or pay by card.')
                startPolling(res.intent_id)
            }
        } catch (e) {
            setVwMsg('')
            swalError(e.message || 'Virtual Wallet could not start the payment. No charge was made.')
        } finally {
            setProcessing(false)
        }
    }

    const startPolling = (intentId) => {
        stopPolling()
        setVwPolling(true)
        pollRef.current = setInterval(async () => {
            try {
                const st = await apiFetch(`/vw/status?intent_id=${encodeURIComponent(intentId)}`)
                if (st?.status === 'completed') {
                    stopPolling()
                    const confirm = await apiFetch('/vw/confirm', {
                        method: 'POST',
                        body: JSON.stringify({ intent_id: intentId }),
                    })
                    navigate(`/payment/success?intent_id=${encodeURIComponent(intentId)}&plan_name=${encodeURIComponent(confirm?.plan_name || plan.name)}`)
                } else if (st?.status === 'failed') {
                    stopPolling()
                    setVwMsg('The payment failed. No charge was made. Please try again.')
                }
            } catch {
                // keep polling while the provider settles the payment
            }
        }, 3000)
    }

    const handleVWCard = async () => {
        if (!vw || processing) return
        if (!vwCard.name.trim() || !vwCard.cardNum.trim() || !vwCard.expiration.trim() || !vwCard.cvv.trim()) {
            swalError('Complete all card fields.')
            return
        }
        setProcessing(true)
        setVwMsg('')
        try {
            stopPolling()
            await apiFetch('/vw/process-card', {
                method: 'POST',
                body: JSON.stringify({
                    intent_id: vw.intent_id,
                    name: vwCard.name,
                    cardNum: vwCard.cardNum.replace(/\s/g, ''),
                    expiration: vwCard.expiration,
                    CVV: vwCard.cvv,
                }),
            })
            // Explicit user action (Pay). Only now confirm and go to the result.
            const confirm = await apiFetch('/vw/confirm', {
                method: 'POST',
                body: JSON.stringify({ intent_id: vw.intent_id }),
            })
            navigate(`/payment/success?intent_id=${encodeURIComponent(vw.intent_id)}&plan_name=${encodeURIComponent(confirm?.plan_name || plan.name)}${vw.demo ? '&demo=1' : ''}`)
        } catch (e) {
            setVwMsg('')
            swalError(e.message || 'The payment was declined. No charge was made.')
        } finally {
            setProcessing(false)
        }
    }

    useEffect(() => () => stopPolling(), [])

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
        <div className="co-page co-page-inline">
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
                                    <span className="co-price-value">{displayPrice}</span>
                                    <span className="co-price-period">/{billing === 'yearly' ? 'year' : 'month'}</span>
                                    {couponApplied && (
                                        <span className="co-coupon-applied">
                                            <Tag size={12} /> {couponApplied.code} applied
                                            {couponApplied.discount_amount > 0
                                                ? ` (−$${couponApplied.discount_amount.toFixed(2)})`
                                                : ` (−${couponApplied.discount_pct}%)`}
                                        </span>
                                    )}
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
                            <h3 className="co-sidebar-title">Secure payment</h3>
                            <div className="co-order-summary">
                                <div className="co-order-row">
                                    <span>{plan.name} ({billing === 'yearly' ? 'Annual' : 'Monthly'})</span>
                                    <span className="co-order-price">{displayPrice}</span>
                                </div>
                                <div className="co-order-divider" />
                                <div className="co-order-row co-order-total">
                                    <span>Total due today</span>
                                    <span className="co-total-price">{displayPrice}</span>
                                </div>
                            </div>

                            <div className="co-coupon">
                                <input
                                    className="co-coupon-input"
                                    placeholder="Coupon code"
                                    value={coupon}
                                    onChange={e => setCoupon(e.target.value)}
                                    disabled={!!couponApplied}
                                />
                                {couponApplied ? (
                                    <button className="co-btn co-btn-secondary co-coupon-btn" onClick={() => { setCouponApplied(null); setCoupon('') }}>
                                        Remove
                                    </button>
                                ) : (
                                    <button className="co-btn co-btn-secondary co-coupon-btn" onClick={applyCoupon}>
                                        Apply
                                    </button>
                                )}
                            </div>

                            <button
                                className="co-btn co-btn-primary co-pay-btn"
                                onClick={handleVW}
                                disabled={processing || !!vw}
                            >
                                {processing ? <Loader2 size={16} className="spin" /> : <Wallet size={16} />}
                                {processing ? 'Starting secure checkout…' : 'Pay with Virtual Wallet'}
                            </button>

                            {vw && (
                                <div className="co-vw">
                                    <div className="co-vw-head">
                                        <span>Virtual Wallet checkout</span>
                                        <button className="co-vw-close" onClick={() => { stopPolling(); setVw(null); setVwMsg('') }} title="Cancel">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="co-vw-amount">
                                        ${Number(vw.amount).toFixed(2)}
                                        <span className="co-vw-amount-lbl">Total due today</span>
                                    </div>

                                    {vw.qr ? (
                                        <div className="co-vw-qr">
                                            <img src={`data:image/png;base64,${vw.qr}`} alt="Virtual Wallet QR" />
                                            <p>Scan with the Virtual Wallet app</p>
                                        </div>
                                    ) : (
                                        <div className="co-vw-wait"><RefreshCw size={16} className="spin" /> Waiting for QR…</div>
                                    )}

                                    <div className="co-vw-or"><span>or pay by card</span></div>
                                    <input className="co-vw-input" placeholder="Name on card"
                                        value={vwCard.name} onChange={e => setVwCard({ ...vwCard, name: e.target.value })} />
                                    <input className="co-vw-input" placeholder="Card number" inputMode="numeric" maxLength={19}
                                        value={vwCard.cardNum} onChange={e => setVwCard({ ...vwCard, cardNum: e.target.value })} />
                                    <div className="co-vw-row">
                                        <input className="co-vw-input" placeholder="MM/AA" maxLength={5} inputMode="numeric"
                                            value={vwCard.expiration} onChange={e => setVwCard({ ...vwCard, expiration: e.target.value })} />
                                        <input className="co-vw-input" placeholder="CVV" maxLength={4} type="password" inputMode="numeric"
                                            value={vwCard.cvv} onChange={e => setVwCard({ ...vwCard, cvv: e.target.value })} />
                                    </div>
                                    <button className="co-btn co-btn-secondary co-pay-btn" onClick={handleVWCard} disabled={processing}>
                                        {processing ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
                                        Pay ${Number(vw.amount).toFixed(2)}
                                    </button>
                                    {vwPolling && <div className="co-vw-poll"><RefreshCw size={13} className="spin" /> Confirming payment…</div>}
                                    {vwMsg && <p className="co-vw-msg">{vwMsg}</p>}
                                </div>
                            )}

                            <button
                                className="co-btn co-btn-secondary co-pay-btn"
                                onClick={handlePayPal}
                                disabled={processing}
                                style={{ marginTop: 10 }}
                            >
                                Pay with PayPal
                            </button>

                            <div className="co-secure">
                                <Shield size={14} />
                                <span>Payments processed securely by Virtual Wallet or PayPal</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
