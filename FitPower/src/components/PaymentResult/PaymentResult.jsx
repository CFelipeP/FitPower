import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, Crown, Calendar, Receipt } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useEntitlements } from '../../context/EntitlementsContext'
import './PaymentResult.css'

export default function PaymentResult() {
    const isSuccess = window.location.pathname.includes('success')
    const [searchParams] = useSearchParams()
    const sessionId = searchParams.get('session_id')
    const planNameParam = searchParams.get('plan_name')
    const billingParam = searchParams.get('billing')
    const amountParam = searchParams.get('amount')
    // PayPal appends ?token=<orderID> to the return URL after approval
    const paypalOrder = searchParams.get('paypal_order') || searchParams.get('token')
    // Virtual Wallet returns via ?intent_id=<idempotency key>
    const intentId = searchParams.get('intent_id')
    const { refresh: refreshEntitlements } = useEntitlements()

    const [planName, setPlanName] = useState(planNameParam || null)
    const [billing, setBilling] = useState(billingParam || null)
    const [amount, setAmount] = useState(amountParam || null)
    const [endsAt, setEndsAt] = useState(null)
    const [loading, setLoading] = useState((!!sessionId && !planNameParam) || !!intentId)
    const [failed, setFailed] = useState(false)
    const inFlightRef = useRef(null)

    useEffect(() => {
        if (!isSuccess) return
        let cancelled = false

        // Single shared promise so React StrictMode's double-invocation of the
        // effect does not strand the "Confirming your subscription…" state:
        // the second run awaits the same in-flight capture instead of
        // early-returning and skipping the loading reset.
        const run = async () => {
            try {
                setLoading(true)
                // Safety net: never leave the user on a forever-spinning
                // "Confirming…" state (network hang, provider hiccup).
                const hangTimer = setTimeout(() => { if (!cancelled) setFailed(true) }, 30000)
                if (paypalOrder) {
                    if (!inFlightRef.current) {
                        inFlightRef.current = (async () => {
                            await apiFetch('/paypal/capture-order', {
                                method: 'POST',
                                body: JSON.stringify({ orderID: paypalOrder }),
                            })
                            const sub = await apiFetch('/subscriptions')
                            if (sub) {
                                setPlanName(sub.planName || null)
                                setBilling(sub.billing || null)
                                setAmount(sub.price || null)
                                if (sub.endsAt) setEndsAt(new Date(sub.endsAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
                            }
                            await refreshEntitlements()
                        })().finally(() => { inFlightRef.current = null })
                    }
                    await inFlightRef.current
                } else if (sessionId && !planNameParam) {
                    const data = await apiFetch(`/stripe/session?session_id=${encodeURIComponent(sessionId)}`)
                    if (data?.plan_name) {
                        setPlanName(data.plan_name)
                        setAmount(data.amount)
                    } else {
                        setFailed(true)
                    }
                    await refreshEntitlements()
                } else if (intentId) {
                    const confirm = await apiFetch('/vw/confirm', {
                        method: 'POST',
                        body: JSON.stringify({ intent_id: intentId }),
                    })
                    const sub = await apiFetch('/subscriptions')
                    if (sub) {
                        setPlanName(confirm?.plan_name || sub.planName || planNameParam || null)
                        setBilling(sub.billing || billingParam || null)
                        setAmount(sub.price || amountParam || null)
                        if (sub.endsAt) setEndsAt(new Date(sub.endsAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
                    }
                    await refreshEntitlements()
                } else if (planNameParam) {
                    await refreshEntitlements()
                } else {
                    setFailed(true)
                }
                clearTimeout(hangTimer)
            } catch {
                if (!cancelled) setFailed(true)
            } finally {
                setLoading(false)
            }
        }
        run()

        return () => { cancelled = true }
    }, [isSuccess, sessionId, planNameParam, paypalOrder, intentId, refreshEntitlements])

    return (
        <div className="payment-result">
            <div className="payment-result-card">
                {!isSuccess ? (
                    <>
                        <div className="payment-result-icon-wrap cancelled">
                            <XCircle size={52} />
                        </div>
                        <h1>Payment Cancelled</h1>
                        <p>Your payment was cancelled. No charges were made.</p>
                        <div className="payment-result-actions">
                            <Link to="/plans" className="payment-result-btn primary">View Plans</Link>
                            <Link to="/" className="payment-result-btn secondary">Back to Home</Link>
                        </div>
                    </>
                ) : failed ? (
                    <>
                        <div className="payment-result-icon-wrap cancelled">
                            <XCircle size={52} />
                        </div>
                        <h1>Payment could not be completed</h1>
                        <p>
                            We could not confirm your payment, so no subscription was activated.
                            If you were charged, contact support and we will refund you.
                        </p>
                        <div className="payment-result-actions">
                            <Link to="/plans" className="payment-result-btn primary">Try Again</Link>
                            <Link to="/contact" className="payment-result-btn secondary">Contact Support</Link>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="payment-result-icon-wrap success">
                            <CheckCircle size={52} />
                        </div>
                        <h1>Payment Successful!</h1>

                        {loading ? (
                            <p className="payment-result-loading">
                                <Loader2 size={16} className="spin" /> Confirming your subscription…
                            </p>
                        ) : (
                            <div className="payment-result-details">
                                <div className="payment-result-plan">
                                    <Crown size={18} />
                                    <span className="payment-result-plan-name">{planName || 'Your Plan'}</span>
                                    <span className="payment-result-plan-badge">Active</span>
                                </div>

                                <div className="payment-result-info-grid">
                                    {billing && (
                                        <div className="payment-result-info-item">
                                            <Calendar size={14} />
                                            <div>
                                                <span className="payment-result-info-label">Billing</span>
                                                <span className="payment-result-info-value">{billing === 'yearly' ? 'Annual' : 'Monthly'}</span>
                                            </div>
                                        </div>
                                    )}
                                    {amount && (
                                        <div className="payment-result-info-item">
                                            <Receipt size={14} />
                                            <div>
                                                <span className="payment-result-info-label">Amount paid</span>
                                                <span className="payment-result-info-value">${parseFloat(amount).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                    {endsAt && (
                                        <div className="payment-result-info-item">
                                            <Calendar size={14} />
                                            <div>
                                                <span className="payment-result-info-label">Renews on</span>
                                                <span className="payment-result-info-value">{endsAt}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <p className="payment-result-msg">
                                    Your subscription is now active. Welcome to FitPower!
                                </p>
                            </div>
                        )}

                        <div className="payment-result-actions">
                            <Link to="/client/dashboard" className="payment-result-btn primary">
                                <Crown size={16} /> Go to Dashboard
                            </Link>
                            <Link to="/plans" className="payment-result-btn secondary">
                                Manage Subscription
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
