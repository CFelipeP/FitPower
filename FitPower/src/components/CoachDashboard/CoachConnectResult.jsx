import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import './CoachConnectResult.css'

export default function CoachConnectResult({ mode = 'return' }) {
    const [status, setStatus] = useState(null)
    const [error, setError] = useState(false)

    useEffect(() => {
        apiFetch('/coach/connect-status')
            .then(setStatus)
            .catch(() => setError(true))
    }, [])

    const ok = status && status.connected && status.onboardingComplete

    return (
        <div className="ccr-wrap">
            <div className="ccr-card">
                {error || !status ? (
                    <>
                        <Loader2 size={32} className="spin ccr-icon-loading" />
                        <h1 className="ccr-title">Checking your connection...</h1>
                    </>
                ) : ok ? (
                    <>
                        <CheckCircle2 size={40} className="ccr-icon-ok" />
                        <h1 className="ccr-title">Bank account connected!</h1>
                        <p className="ccr-sub">
                            Your payouts are now enabled. Earnings accrue automatically from your completed coaching sessions.
                        </p>
                    </>
                ) : (
                    <>
                        <AlertCircle size={40} className="ccr-icon-warn" />
                        <h1 className="ccr-title">{mode === 'refresh' ? 'Onboarding not finished yet' : 'Connection incomplete'}</h1>
                        <p className="ccr-sub">
                            Your Stripe onboarding is not complete. You can finish it anytime from the Earnings section.
                        </p>
                    </>
                )}
                <div className="ccr-actions">
                    <Link to="/coach/dashboard" className="ccr-btn ccr-btn-primary">Go to Dashboard</Link>
                </div>
            </div>
        </div>
    )
}
