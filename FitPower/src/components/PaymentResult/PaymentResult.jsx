import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, Crown } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import './PaymentResult.css'

export default function PaymentResult() {
    const isSuccess = window.location.pathname.includes('success')
    const [searchParams] = useSearchParams()
    const sessionId = searchParams.get('session_id')
    const [planName, setPlanName] = useState(null)
    const [loading, setLoading] = useState(!!sessionId)

    useEffect(() => {
        if (!isSuccess || !sessionId) return
        let cancelled = false
        apiFetch(`/stripe/session?session_id=${encodeURIComponent(sessionId)}`)
            .then(data => {
                if (!cancelled && data?.plan_name) setPlanName(data.plan_name)
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [isSuccess, sessionId])

    return (
        <div className="payment-result">
            <div className="payment-result-card">
                {isSuccess ? (
                    <>
                        <CheckCircle size={48} className="payment-result-icon success" />
                        <h1>Payment Successful!</h1>
                        {loading ? (
                            <p><Loader2 size={16} className="spin" style={{ verticalAlign: 'middle', marginRight: 8 }} />Loading plan details…</p>
                        ) : planName ? (
                            <p>Your <strong>{planName}</strong> subscription is now active. Welcome to FitPower!</p>
                        ) : (
                            <p>Your subscription is now active. Welcome to FitPower!</p>
                        )}
                        <Link to="/client/dashboard" className="payment-result-btn">
                            <Crown size={16} /> Go to Dashboard
                        </Link>
                    </>
                ) : (
                    <>
                        <XCircle size={48} className="payment-result-icon cancelled" />
                        <h1>Payment Cancelled</h1>
                        <p>Your payment was cancelled. No charges were made.</p>
                        <Link to="/plans" className="payment-result-btn" style={{ marginRight: 12 }}>View Plans</Link>
                        <Link to="/" className="payment-result-btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', display: 'inline-block', marginTop: 8 }}>Back to Home</Link>
                    </>
                )}
            </div>
        </div>
    )
}
