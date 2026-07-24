import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, Crown, Calendar, Receipt } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import './PaymentResult.css'

export default function PaymentResult() {
    const isSuccess = window.location.pathname.includes('success')
    const [searchParams] = useSearchParams()
    const sessionId = searchParams.get('session_id')
    const planNameParam = searchParams.get('plan_name')
    const billingParam = searchParams.get('billing')
    const amountParam = searchParams.get('amount')

    const { user } = useAuth()
    const [planName, setPlanName] = useState(planNameParam || null)
    const [billing, setBilling] = useState(billingParam || null)
    const [amount, setAmount] = useState(amountParam || null)
    const [endsAt, setEndsAt] = useState(null)
    const [loading, setLoading] = useState(!!sessionId && !planNameParam)

    useEffect(() => {
        if (!isSuccess) return
        let cancelled = false

        if (sessionId && !planNameParam) {
            apiFetch(`/stripe/session?session_id=${encodeURIComponent(sessionId)}`)
                .then(data => {
                    if (!cancelled && data?.plan_name) {
                        setPlanName(data.plan_name)
                        setAmount(data.amount)
                    }
                })
                .catch(() => {})
                .finally(() => { if (!cancelled) setLoading(false) })
        } else if (planNameParam) {
            setLoading(false)
            const endsDate = new Date()
            if (billing === 'yearly') endsDate.setFullYear(endsDate.getFullYear() + 1)
            else endsDate.setMonth(endsDate.getMonth() + 1)
            setEndsAt(endsDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
        } else {
            setLoading(false)
        }

        return () => { cancelled = true }
    }, [isSuccess, sessionId, planNameParam, billing])

    return (
        <div className="payment-result">
            <div className="payment-result-card">
                {isSuccess ? (
                    <>
                        <div className="payment-result-icon-wrap success">
                            <CheckCircle size={52} />
                        </div>
                        <h1>Payment Successful!</h1>

                        {loading ? (
                            <p className="payment-result-loading">
                                <Loader2 size={16} className="spin" /> Loading plan details…
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
                ) : (
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
                )}
            </div>
        </div>
    )
}
