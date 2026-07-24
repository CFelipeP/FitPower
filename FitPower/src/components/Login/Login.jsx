import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import { useSearchParams } from 'react-router-dom'
import {
    Zap, Mail, Lock, Eye, EyeOff, ArrowLeft,
    Activity, BarChart3, Sparkles,
    Monitor, Smartphone,
    KeyRound, ShieldCheck, Check, AlertTriangle,
    CheckCircle
} from 'lucide-react'
import './Login.css'

const VIEWS = {
    LOGIN_EMAIL: 'loginEmailView',
    LOGIN_PASS: 'loginPassView',
    FORGOT: 'forgotView',
    CODE: 'codeView',
    NEW_PASS: 'newPassView',
    SUCCESS: 'successView',
    SETUP_PASS: 'setupPassView',
}

export default function Login() {
    const { showToast } = useToast()
    const { login, logout, isAuthenticated, initialized, user } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    // View
    const [currentView, setCurrentView] = useState(
        searchParams.get('setup_password') === '1' ? VIEWS.SETUP_PASS : VIEWS.LOGIN_EMAIL
    )

    // Active sessions
    const [activeSessions, setActiveSessions] = useState([])
    const [sessionsLoading, setSessionsLoading] = useState(false)
    const [emailRole, setEmailRole] = useState(null)

    // Public stats
    const [publicStats, setPublicStats] = useState({ workouts: 0, trainers: 0, clients: 0 })

    // Handle token from OAuth redirect
    useEffect(() => {
        const token = searchParams.get('token')
        const refreshToken = searchParams.get('refresh_token')
        const error = searchParams.get('error')
        if (error) {
            showToast('Google login: ' + decodeURIComponent(error))
            return
        }
        if (token) {
            localStorage.setItem('token', token)
            if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
            // Navigate cleanly - AuthContext will pick up token from localStorage on mount
            window.location.href = searchParams.get('setup_password') === '1' ? '/login?setup_password=1' : '/client/dashboard'
        }
    }, [searchParams, showToast])

    // Redirect to dashboard if already authenticated (e.g., after Google OAuth reload)
    useEffect(() => {
        if (initialized && isAuthenticated && currentView !== VIEWS.SETUP_PASS) {
            const dashboards = { admin: '/admin/dashboard', coach: '/coach/dashboard', client: '/client/dashboard' }
            navigate(dashboards[user?.role] || '/client/dashboard', { replace: true })
        }
    }, [initialized, isAuthenticated, currentView, user, navigate])

    // Fetch public stats for left panel
    useEffect(() => {
        fetch('/api/auth/public-stats')
            .then(r => r.json())
            .then(d => { if (d.success && d.data) setPublicStats(d.data) })
            .catch(() => {})
    }, [])

    // Login form
    const [loginEmail, setLoginEmail] = useState('')
    const [loginPassword, setLoginPassword] = useState('')
    const [loginPassVisible, setLoginPassVisible] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)
    const [loginTouched, setLoginTouched] = useState({ email: false, password: false })
    const [loginError, setLoginError] = useState(false)
    const [loginLoading, setLoginLoading] = useState(false)

    // Forgot form
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotTouched, setForgotTouched] = useState(false)
    const [forgotLoading, setForgotLoading] = useState(false)

    // Code verification
    const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', ''])
    const [codeError, setCodeError] = useState(false)
    const [resendTimer, setResendTimer] = useState(0)
    const [verifying, setVerifying] = useState(false)
    const codeInputsRef = useRef([])
    const verifyTimeoutRef = useRef(null)

    // New password
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [newPassVisible, setNewPassVisible] = useState(false)
    const [confirmPassVisible, setConfirmPassVisible] = useState(false)
    const [newPassTouched, setNewPassTouched] = useState(false)
    const [confirmTouched, setConfirmTouched] = useState(false)
    const [savingPass, setSavingPass] = useState(false)
    const [resetToken, setResetToken] = useState(null)
    const [setupPassword, setSetupPassword] = useState('')
    const [setupConfirm, setSetupConfirm] = useState('')
    const [setupVisible, setSetupVisible] = useState(false)
    const [setupSaving, setSetupSaving] = useState(false)

    const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
    const validatePass = (val) => val.length >= 8

    // Password strength
    const strength = useMemo(() => {
        if (!newPassword) return { width: '0', color: '', label: '' }
        let score = 0
        if (newPassword.length >= 8) score++
        if (newPassword.length >= 12) score++
        if (/[A-Z]/.test(newPassword)) score++
        if (/[0-9]/.test(newPassword)) score++
        if (/[^A-Za-z0-9]/.test(newPassword)) score++
        const levels = [
            { width: '10%', color: '#ef4444', label: 'Very weak' },
            { width: '25%', color: '#ef4444', label: 'Weak' },
            { width: '50%', color: '#f97316', label: 'Fair' },
            { width: '75%', color: '#eab308', label: 'Good' },
            { width: '90%', color: '#22c55e', label: 'Strong' },
            { width: '100%', color: '#22c55e', label: 'Very strong' },
        ]
        return levels[Math.min(score, 5)]
    }, [newPassword])

    // Resend timer
    useEffect(() => {
        if (resendTimer <= 0) return
        const id = setInterval(() => setResendTimer((t) => t - 1), 1000)
        return () => clearInterval(id)
    }, [resendTimer])

    useEffect(() => {
        return () => {
            if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current)
        }
    }, [])

    const showView = (view) => {
        setCurrentView(view)
        setLoginError(false)
        setCodeError(false)
    }

    // Login handler
    const handleLogin = async () => {
        setLoginTouched({ email: true, password: true })
        setLoginError(false)

        if (!validateEmail(loginEmail) || !loginPassword) return

        setLoginLoading(true)
        try {
            const user = await login(loginEmail, loginPassword)
            const dashboards = { admin: '/admin/dashboard', coach: '/coach/dashboard', client: '/client/dashboard' }
            navigate(dashboards[user?.role] || '/client/dashboard')
        } catch (e) {
            setLoginError(e.message || true)
            setLoginLoading(false)
        }
    }

    // Forgot handler
    const handleSendCode = async () => {
        setForgotTouched(true)
        if (!validateEmail(forgotEmail)) return

        setForgotLoading(true)
        try {
            const res = await fetch('/api/auth/forgot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail }),
            })
            const data = await res.json()
            if (data.success && data.data?.resetToken) {
                setResetToken(data.data.resetToken)
                setForgotLoading(false)
                showView(VIEWS.NEW_PASS)
            } else {
                showToast(data.message || 'Error sending reset code')
                setForgotLoading(false)
            }
        } catch {
            showToast('Server connection error')
            setForgotLoading(false)
        }
    }

    // Code handlers
    const handleCodeChange = (index, value) => {
        const digit = value.replace(/\D/g, '').slice(0, 1)
        const newDigits = [...codeDigits]
        newDigits[index] = digit
        setCodeDigits(newDigits)
        setCodeError(false)

        if (digit && index < 5) {
            const next = codeInputsRef.current[index + 1]
            if (next) next.focus()
        }
    }

    const handleCodeKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
            const newDigits = [...codeDigits]
            newDigits[index - 1] = ''
            setCodeDigits(newDigits)
            const prev = codeInputsRef.current[index - 1]
            if (prev) prev.focus()
        }
    }

    const handleCodePaste = (e) => {
        e.preventDefault()
        const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6)
        const newDigits = [...codeDigits]
        pasted.split('').forEach((ch, i) => { newDigits[i] = ch })
        setCodeDigits(newDigits)
        const lastIdx = Math.min(pasted.length - 1, 5)
        const target = codeInputsRef.current[lastIdx]
        if (target) target.focus()
    }

    const handleVerifyCode = () => {
        setVerifying(true)
        if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current)
        verifyTimeoutRef.current = setTimeout(() => {
            setVerifying(false)
            showView(VIEWS.NEW_PASS)
        }, 800)
    }

    const codeComplete = codeDigits.every((d) => d)

    // New password handler
    const handleSavePassword = async () => {
        setNewPassTouched(true)
        setConfirmTouched(true)
        if (!validatePass(newPassword) || newPassword !== confirmPassword) return

        setSavingPass(true)
        try {
            if (!resetToken) {
                showToast('Recovery token not found')
                setSavingPass(false)
                return
            }
            const res = await fetch('/api/auth/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: resetToken, password: newPassword }),
            })
            const data = await res.json()
            if (!data.success) {
                showToast(data.message || 'Error resetting password')
                setSavingPass(false)
                return
            }
            setResetToken(null)
            showView(VIEWS.SUCCESS)
        } catch {
            showToast('Server connection error')
        } finally {
            setSavingPass(false)
        }
    }

    const handleSetupPassword = async () => {
        if (!setupPassword || setupPassword.length < 8) { showToast('Password must be at least 8 characters'); return }
        if (setupPassword !== setupConfirm) { showToast('Passwords do not match'); return }
        setSetupSaving(true)
        try {
            await apiFetch('/auth/set-password', {
                method: 'PUT',
                body: JSON.stringify({ password: setupPassword }),
            })
            showToast('Password set successfully!')
            navigate('/client/dashboard')
        } catch (e) {
            showToast(e.message || 'Error setting password')
        } finally {
            setSetupSaving(false)
        }
    }

    const handleGoToLogin = () => {
        setLoginEmail('')
        setLoginPassword('')
        setForgotEmail('')
        setNewPassword('')
        setConfirmPassword('')
        setCodeDigits(['', '', '', '', '', ''])
        setLoginTouched({ email: false, password: false })
        setForgotTouched(false)
        setNewPassTouched(false)
        setConfirmTouched(false)
        setLoginError(false)
        setResetToken(null)
        setSetupPassword('')
        setSetupConfirm('')
        showView(VIEWS.LOGIN_EMAIL)
    }

    const sessionIcons = { desktop: Monitor, mobile: Smartphone, tablet: Monitor }

    const handleEmailContinue = async () => {
        setLoginTouched({ email: true, password: false })
        if (!validateEmail(loginEmail)) return

        setSessionsLoading(true)
        try {
            const res = await fetch('/api/auth/sessions-by-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail }),
            })
            const data = await res.json()
            setActiveSessions(data.data?.sessions || [])
            setEmailRole(data.data?.role || null)
        } catch {
            setActiveSessions([])
        }
        setSessionsLoading(false)
        showView(VIEWS.LOGIN_PASS)
    }

    return (
        <div className="login-page noise grid-pattern">
            <div className="login-layout">

                {/* LEFT PANEL */}
                <div className="login-left">
                    <img loading="lazy"                         src="https://media.revistagq.com/photos/65b12cfd195fefc5e6d8fe02/3:2/w_2559,h_1706,c_limit/fitness%20portada.jpg"
                        alt="HIIT Training"
                        className="login-left-bg"
                    />

                    <div className="login-left-content">
                        <a href="/" className="login-logo">
                            <div className="login-logo-icon">
                                <Zap size={20} color="#000" />
                            </div>
                            <span className="login-logo-text">Fit<span className="text-power">Power</span></span>
                        </a>
                    </div>

                    <div className="login-left-body">
                        <div className="login-glass-card">
                            <h2 className="login-left-heading">
                                Welcome<br /><span className="text-power text-glow">back</span>
                            </h2>
                            <p className="login-left-desc">
                                Your programs, progress, and community are waiting. Pick up right where you left off.
                            </p>

                            <div className="login-benefits">
                                <div className="login-benefit-item">
                                    <div className="login-benefit-icon">
                                        <Activity size={20} />
                                    </div>
                                    <div>
                                        <div className="login-benefit-title">Your streak continues</div>
                                        <div className="login-benefit-sub">We kept your data safe while you were away</div>
                                    </div>
                                </div>
                                <div className="login-benefit-item">
                                    <div className="login-benefit-icon">
                                        <BarChart3 size={20} />
                                    </div>
                                    <div>
                                        <div className="login-benefit-title">Progress preserved</div>
                                        <div className="login-benefit-sub">All your metrics, PRs, and history synced</div>
                                    </div>
                                </div>
                                <div className="login-benefit-item">
                                    <div className="login-benefit-icon">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <div className="login-benefit-title">New programs added</div>
                                        <div className="login-benefit-sub">12 new routines since your last session</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    {emailRole !== 'coach' && (
                    <div className="login-left-stats">
                        <div className="login-stats-card">
                            <div className="login-stat">
                                <div className="login-stat-value login-stat-value-accent">{publicStats.workouts || 0}</div>
                                <div className="login-stat-label">Workouts<br />completed</div>
                            </div>
                            <div className="login-stat-divider"></div>
                            <div className="login-stat">
                                <div className="login-stat-value">{publicStats.trainers || 0}</div>
                                <div className="login-stat-label">Certified<br />trainers</div>
                            </div>
                            <div className="login-stat-divider"></div>
                            <div className="login-stat">
                                <div className="login-stat-value">{publicStats.clients || 0}</div>
                                <div className="login-stat-label">Clients<br />joined</div>
                            </div>
                        </div>
                    </div>
                    )}

                    <div className="login-left-decor-circle"></div>
                    <div className="login-left-decor-glow"></div>
                </div>

                {/* RIGHT PANEL */}
                <div className="login-right">
                    {/* Mobile Header */}
                    <div className="login-mobile-header">
                        <a href="/" className="login-logo login-logo-sm">
                            <div className="login-logo-icon login-logo-icon-sm">
                                <Zap size={16} color="#000" />
                            </div>
                            <span className="login-logo-text login-logo-text-sm">Fit<span className="text-power">Power</span></span>
                        </a>
                        <a href="/" className="login-back-link">← Back</a>
                    </div>

                    {/* Form Container */}
                    <div className="login-form-wrapper">
                        <div className="login-form-container">

                            {/* Back to home */}
                            <a href="/" className="login-back-home">
                                <ArrowLeft size={14} /> Back to home
                            </a>

                            {/* LOGIN EMAIL STEP */}
                            {currentView === VIEWS.LOGIN_EMAIL && (
                                <div className="login-view-content">
                                    <h1 className="login-title">Log in</h1>
                                    <p className="login-subtitle">Enter your email to continue.</p>

                                    {/* Email */}
                                    <div className="login-field">
                                        <input
                                            type="email"
                                            className={`login-input ${loginTouched.email ? (validateEmail(loginEmail) ? 'success' : 'error') : ''}`}
                                            placeholder="Email address"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            onBlur={() => setLoginTouched((p) => ({ ...p, email: true }))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleEmailContinue()}
                                            autoComplete="email"
                                            autoFocus
                                        />
                                        <Mail size={18} className="login-input-icon" />
                                        {loginTouched.email && !validateEmail(loginEmail) && (
                                            <div className="login-field-error visible">Please enter a valid email</div>
                                        )}
                                    </div>

                                    {/* Error Banner */}
                                    {loginError && (
                                        <div className="login-error-banner">
                                            <AlertTriangle size={20} className="login-error-icon" />
                                            <div>
                                                <div className="login-error-title">Error</div>
                                                <div className="login-error-desc">{typeof loginError === 'string' ? loginError : 'Please enter a valid email address.'}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Continue Button */}
                                    <button
                                        type="button"
                                        className="login-btn-primary btn-shine"
                                        onClick={handleEmailContinue}
                                        disabled={sessionsLoading}
                                    >
                                        {sessionsLoading ? (
                                            <><span className="login-spinner"></span> Loading...</>
                                        ) : (
                                            'Continue'
                                        )}
                                    </button>

                                    {/* Register Link */}
                                    <p className="login-register-link">
                                        Don't have an account?
                                        <Link to="/register" className="login-register-link-accent">Sign up free</Link>
                                    </p>
                                </div>
                            )}

                            {/* LOGIN PASSWORD STEP */}
                            {currentView === VIEWS.LOGIN_PASS && (
                                <div className="login-view-content">
                                    <button
                                        type="button"
                                        className="login-back-btn"
                                        onClick={() => { showView(VIEWS.LOGIN_EMAIL); setLoginPassword(''); setActiveSessions([]); setEmailRole(null); setLoginError(false) }}
                                    >
                                        <ArrowLeft size={16} /> Use another account
                                    </button>

                                    <div className="login-email-badge">
                                        <Mail size={16} />
                                        <span>{loginEmail}</span>
                                    </div>

                                    <h1 className="login-title" style={{ fontSize: 22 }}>Welcome back</h1>
                                    <p className="login-subtitle">Enter your password to sign in.</p>

                                    {/* Active Sessions */}
                                    {activeSessions.length > 0 && (
                                        <div className="login-sessions">
                                            <div className="login-sessions-header">
                                                <span className="login-sessions-title">Active sessions</span>
                                                <span className="login-sessions-count">{activeSessions.length} other device{activeSessions.length !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div className="login-devices">
                                                {activeSessions.map((d, i) => {
                                                    const Icon = sessionIcons[d.deviceType] || Monitor
                                                    return (
                                                        <div key={i} className="login-device-item">
                                                            <div className="login-device-icon">
                                                                <Icon size={16} />
                                                            </div>
                                                            <div className="login-device-info">
                                                                <div className="login-device-name">{d.deviceName}</div>
                                                                <div className="login-device-location">{d.timeAgo}</div>
                                                            </div>
                                                            <span className="login-device-dot"></span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Password */}
                                    <div className="login-field">
                                        <input
                                            type={loginPassVisible ? 'text' : 'password'}
                                            className={`login-input login-input-pass ${loginTouched.password ? (loginPassword ? 'success' : 'error') : ''}`}
                                            placeholder="Password"
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            onBlur={() => setLoginTouched((p) => ({ ...p, password: true }))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                            autoComplete="current-password"
                                            autoFocus
                                        />
                                        <Lock size={18} className="login-input-icon" />
                                        <button
                                            type="button"
                                            className="login-toggle-pass"
                                            onClick={() => setLoginPassVisible(!loginPassVisible)}
                                            aria-label="Toggle password"
                                        >
                                            {loginPassVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                        {loginTouched.password && !loginPassword && (
                                            <div className="login-field-error visible">Password is required</div>
                                        )}
                                    </div>

                                    {/* Remember + Forgot */}
                                    <div className="login-options">
                                        <label className="login-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                            />
                                            <div className="login-checkbox-box">
                                                <Check size={10} strokeWidth={3} />
                                            </div>
                                            <span className="login-checkbox-text">Remember me</span>
                                        </label>
                                        <button
                                            type="button"
                                            className="login-forgot-btn"
                                            onClick={() => showView(VIEWS.FORGOT)}
                                        >
                                            Forgot password?
                                        </button>
                                    </div>

                                    {/* Error Banner */}
                                    {loginError && (
                                        <div className="login-error-banner">
                                            <AlertTriangle size={20} className="login-error-icon" />
                                            <div>
                                                <div className="login-error-title">Error</div>
                                                <div className="login-error-desc">{typeof loginError === 'string' ? loginError : 'The password you entered is incorrect. Please try again.'}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Login Button */}
                                    <button
                                        type="button"
                                        className="login-btn-primary btn-shine"
                                        onClick={handleLogin}
                                        disabled={loginLoading}
                                    >
                                        {loginLoading ? (
                                            <><span className="login-spinner"></span> Signing in...</>
                                        ) : (
                                            'Log In'
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* FORGOT PASSWORD */}
                            {currentView === VIEWS.FORGOT && (
                                <div className="login-view-content">
                                    <button
                                        type="button"
                                        className="login-back-btn"
                                        onClick={() => showView(VIEWS.LOGIN_EMAIL)}
                                    >
                                        <ArrowLeft size={16} /> Back to login
                                    </button>

                                    <div className="login-icon-box">
                                        <KeyRound size={32} className="login-icon-box-icon" />
                                    </div>

                                    <h1 className="login-title">Reset password</h1>
                                    <p className="login-subtitle">Enter your email and we'll send you a code to reset your password.</p>

                                    <div className="login-field">
                                        <input
                                            type="email"
                                            className={`login-input ${forgotTouched ? (validateEmail(forgotEmail) ? 'success' : 'error') : ''}`}
                                            placeholder="Email address"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            onBlur={() => setForgotTouched(true)}
                                            autoComplete="email"
                                        />
                                        <Mail size={18} className="login-input-icon" />
                                        {forgotTouched && !validateEmail(forgotEmail) && (
                                            <div className="login-field-error visible">Please enter a valid email</div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        className="login-btn-primary btn-shine"
                                        onClick={handleSendCode}
                                        disabled={forgotLoading}
                                    >
                                        {forgotLoading ? (
                                            <><span className="login-spinner"></span> Sending...</>
                                        ) : (
                                            'Send Reset Code'
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* CODE VERIFICATION */}
                            {currentView === VIEWS.CODE && (
                                <div className="login-view-content">
                                    <button
                                        type="button"
                                        className="login-back-btn"
                                        onClick={() => showView(VIEWS.FORGOT)}
                                    >
                                        <ArrowLeft size={16} /> Back
                                    </button>

                                    <div className="login-icon-box">
                                        <ShieldCheck size={32} className="login-icon-box-icon" />
                                    </div>

                                    <h1 className="login-title">Enter code</h1>
                                    <p className="login-subtitle" style={{ marginBottom: 8 }}>We sent a 6-digit code to</p>
                                    <p className="login-code-email">{forgotEmail || 'your@email.com'}</p>

                                    <div className="login-code-inputs">
                                        {codeDigits.map((digit, i) => (
                                            <input
                                                key={i}
                                                ref={(el) => (codeInputsRef.current[i] = el)}
                                                type="text"
                                                maxLength={1}
                                                className={`login-code-input ${digit ? 'filled' : ''}`}
                                                inputMode="numeric"
                                                value={digit}
                                                onChange={(e) => handleCodeChange(i, e.target.value)}
                                                onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                                onPaste={i === 0 ? handleCodePaste : undefined}
                                                autoFocus={i === 0}
                                            />
                                        ))}
                                    </div>

                                    {codeError && (
                                        <p className="login-code-error">Invalid code. Please try again or request a new one.</p>
                                    )}

                                    <div className="login-resend">
                                        <span className="login-resend-text">Didn't receive it? </span>
                                        <button
                                            type="button"
                                            className="login-resend-btn"
                                            disabled={resendTimer > 0}
                                            onClick={() => {
                                                setResendTimer(60)
                                            }}
                                        >
                                            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className="login-btn-primary btn-shine"
                                        onClick={handleVerifyCode}
                                        disabled={!codeComplete || verifying}
                                    >
                                        {verifying ? (
                                            <><span className="login-spinner"></span> Verifying...</>
                                        ) : (
                                            'Verify Code'
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* NEW PASSWORD */}
                            {currentView === VIEWS.NEW_PASS && (
                                <div className="login-view-content">
                                    <div className="login-icon-box login-icon-box-success">
                                        <CheckCircle size={32} className="login-icon-box-icon-success" />
                                    </div>

                                    <h1 className="login-title">Set new password</h1>
                                    <p className="login-subtitle">Choose a strong password that you haven't used before.</p>

                                    <div className="login-field">
                                        <input
                                            type={newPassVisible ? 'text' : 'password'}
                                            className={`login-input login-input-pass ${newPassTouched ? (validatePass(newPassword) ? 'success' : 'error') : ''}`}
                                            placeholder="New password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            onBlur={() => setNewPassTouched(true)}
                                        />
                                        <Lock size={18} className="login-input-icon" />
                                        <button
                                            type="button"
                                            className="login-toggle-pass"
                                            onClick={() => setNewPassVisible(!newPassVisible)}
                                            aria-label="Toggle password"
                                        >
                                            {newPassVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                        {newPassTouched && !validatePass(newPassword) && (
                                            <div className="login-field-error visible">Minimum 8 characters required</div>
                                        )}
                                    </div>

                                    {newPassword && (
                                        <div className="login-strength-container">
                                            <div className="login-strength-bar">
                                                <div className="login-strength-fill" style={{ width: strength.width, background: strength.color }}></div>
                                            </div>
                                            <div className="login-strength-label" style={{ color: strength.color }}>{strength.label}</div>
                                        </div>
                                    )}

                                    <div className="login-field">
                                        <input
                                            type={confirmPassVisible ? 'text' : 'password'}
                                            className={`login-input login-input-pass ${confirmTouched ? (confirmPassword && confirmPassword === newPassword ? 'success' : 'error') : ''}`}
                                            placeholder="Confirm password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            onBlur={() => setConfirmTouched(true)}
                                        />
                                        <Lock size={18} className="login-input-icon" />
                                        <button
                                            type="button"
                                            className="login-toggle-pass"
                                            onClick={() => setConfirmPassVisible(!confirmPassVisible)}
                                            aria-label="Toggle password"
                                        >
                                            {confirmPassVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                        {confirmTouched && (!confirmPassword || confirmPassword !== newPassword) && (
                                            <div className="login-field-error visible">Passwords do not match</div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        className="login-btn-primary btn-shine"
                                        onClick={handleSavePassword}
                                        disabled={savingPass}
                                    >
                                        {savingPass ? (
                                            <><span className="login-spinner"></span> Saving...</>
                                        ) : (
                                            'Reset Password'
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* SETUP PASSWORD (after Google login) */}
                            {currentView === VIEWS.SETUP_PASS && (
                                <div className="login-view-content">
                                    <div className="login-icon-box login-icon-box-success">
                                        <ShieldCheck size={32} className="login-icon-box-icon-success" />
                                    </div>
                                    <h1 className="login-title">Set your password</h1>
                                    <p className="login-subtitle">Choose a password so you can also log in with your email.</p>

                                    <div className="login-field">
                                        <input
                                            type={setupVisible ? 'text' : 'password'}
                                            className={`login-input login-input-pass ${setupPassword ? (setupPassword.length >= 8 ? 'success' : 'error') : ''}`}
                                            placeholder="New password"
                                            value={setupPassword}
                                            onChange={e => setSetupPassword(e.target.value)}
                                        />
                                        <Lock size={18} className="login-input-icon" />
                                        <button type="button" className="login-toggle-pass" onClick={() => setSetupVisible(!setupVisible)}>
                                            {setupVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    <div className="login-field">
                                        <input
                                            type={setupVisible ? 'text' : 'password'}
                                            className={`login-input login-input-pass ${setupConfirm ? (setupConfirm === setupPassword ? 'success' : 'error') : ''}`}
                                            placeholder="Confirm password"
                                            value={setupConfirm}
                                            onChange={e => setSetupConfirm(e.target.value)}
                                        />
                                        <Lock size={18} className="login-input-icon" />
                                    </div>

                                    <button
                                        type="button"
                                        className="login-btn-primary btn-shine"
                                        onClick={handleSetupPassword}
                                        disabled={setupSaving || !setupPassword || setupPassword.length < 8 || setupPassword !== setupConfirm}
                                    >
                                        {setupSaving ? <><span className="login-spinner"></span> Saving...</> : 'Set Password'}
                                    </button>

                                    <p className="login-register-link" style={{ marginTop: 16 }}>
                                        <button type="button" className="login-forgot-btn" onClick={() => { handleGoToLogin(); logout() }}>
                                            Skip for now
                                        </button>
                                    </p>
                                </div>
                            )}

                            {/* SUCCESS */}
                            {currentView === VIEWS.SUCCESS && (
                                <div className="login-success-screen">
                                    <div className="login-success-check">
                                        <CheckCircle size={40} className="login-success-icon" />
                                    </div>
                                    <h1 className="login-title" style={{ textAlign: 'center' }}>Password updated</h1>
                                    <p className="login-subtitle login-subtitle-success">
                                        Your password has been changed successfully. You can now log in with your new credentials.
                                    </p>
                                    <button
                                        type="button"
                                        className="login-btn-primary btn-shine login-btn-success"
                                        onClick={handleGoToLogin}
                                    >
                                        Log In Now
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="login-footer">
                        <p className="login-footer-text">© {new Date().getFullYear()} FitPower. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
