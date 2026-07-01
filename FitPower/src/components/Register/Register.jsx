import { useState, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import {
    Zap, ArrowLeft, Check, ChevronRight,
    User, Mail, Lock, Eye, EyeOff,
    Sprout, Flame, Trophy,
    TrendingDown, Dumbbell, HeartPulse, Sparkles,
    ShieldCheck, Brain, XCircle, Star
} from 'lucide-react'
import './Register.css'

export default function Register() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const { register: authRegister } = useAuth()

    // Steps
    const [currentStep, setCurrentStep] = useState(1)
    // Form data
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [passVisible, setPassVisible] = useState(false)
    const [termsAccepted, setTermsAccepted] = useState(false)

    // Selections
    const [selectedLevel, setSelectedLevel] = useState('')
    const [selectedGoal, setSelectedGoal] = useState('')
    const [selectedDays, setSelectedDays] = useState('')

    // Validation
    const [touched, setTouched] = useState({ firstName: false, lastName: false, email: false, password: false })

    // Submit
    const [submitting, setSubmitting] = useState(false)

    const passInputRef = useRef(null)

    const validateName = (val) => val.trim().length >= 1
    const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
    const validatePass = (val) => val.length >= 8

    const handleBlur = (field) => {
        setTouched((prev) => ({ ...prev, [field]: true }))
    }

    // Password strength
    const strength = useMemo(() => {
        if (!password) return { score: 0, label: '', color: '', width: '0' }
        let score = 0
        if (password.length >= 8) score++
        if (password.length >= 12) score++
        if (/[A-Z]/.test(password)) score++
        if (/[0-9]/.test(password)) score++
        if (/[^A-Za-z0-9]/.test(password)) score++

        const levels = [
            { width: '10%', color: '#ef4444', label: 'Very weak' },
            { width: '25%', color: '#ef4444', label: 'Weak' },
            { width: '50%', color: '#f97316', label: 'Fair' },
            { width: '75%', color: '#eab308', label: 'Good' },
            { width: '90%', color: '#22c55e', label: 'Strong' },
            { width: '100%', color: '#22c55e', label: 'Very strong' },
        ]
        const lvl = levels[Math.min(score, 5)]
        return { score, ...lvl }
    }, [password])

    const goToStep = (step) => {
        setCurrentStep(step)
    }

    const handleToStep2 = () => {
        const v1 = validateName(firstName)
        const v2 = validateName(lastName)
        const v3 = validateEmail(email)
        const v4 = validatePass(password)
        setTouched({ firstName: true, lastName: true, email: true, password: true })

        if (v1 && v2 && v3 && v4) {
            goToStep(2)
        } else {
            showToast('Please fill in all fields correctly')
        }
    }

    const handleToStep3 = () => {
        if (!selectedLevel) { showToast('Please select your fitness level'); return }
        if (!selectedGoal) { showToast('Please select your primary goal'); return }
        if (!selectedDays) { showToast('Please select training frequency'); return }
        goToStep(3)
    }

    const handleSubmit = async () => {
        if (!termsAccepted) return
        setSubmitting(true)
        try {
            await authRegister({
                firstName,
                lastName,
                email,
                password,
                selectedLevel,
                selectedGoal,
                selectedDays,
                termsAccepted,
            })
            navigate('/onboarding')
        } catch (err) {
            showToast(err.message || 'Error registering')
        } finally {
            setSubmitting(false)
        }
    }

    const levelIcon = (level) => {
        const props = { size: 20, className: 'register-icon-level' }
        switch (level) {
            case 'beginner': return <Sprout {...props} />
            case 'intermediate': return <Flame {...props} />
            case 'advanced': return <Trophy {...props} />
            default: return null
        }
    }

    const goalIcon = (goal) => {
        const props = { size: 16, className: 'register-icon-goal' }
        switch (goal) {
            case 'fat-loss': return <TrendingDown {...props} />
            case 'muscle': return <Dumbbell {...props} />
            case 'endurance': return <HeartPulse {...props} />
            case 'wellness': return <Sparkles {...props} />
            default: return null
        }
    }

    const formatGoal = (goal) => goal ? goal.replace('-', ' ') : ''

    return (
        <div className="register-page noise grid-pattern">

            {/* Toast is handled by the global Toast component */}

            {/* Main Layout */}
            <div className="register-layout">

                {/* ═══ LEFT PANEL ═══ */}
                <div className="register-left">
                    <img loading="lazy" 
                        src="https://blog.trainingym.com/hs-fs/hubfs/AdobeStock_174212531%20(1).jpeg?width=999&height=667"
                        alt="Athletes Training"
                        className="register-left-bg"
                    />

                    <div className="register-left-content">
                        <a href="/" className="register-logo">
                            <div className="register-logo-icon">
                                <Zap size={20} color="#000" />
                            </div>
                            <span className="register-logo-text">Fit<span className="text-power">Power</span></span>
                        </a>
                    </div>

                    <div className="register-left-body">
                        <h2 className="register-left-heading">
                            Your transformation<br />starts <span className="text-power text-glow">here</span>
                        </h2>
                        <p className="register-left-desc">
                            Join 15,000+ athletes who train smarter, recover faster, and break plateaus with AI-powered programming.
                        </p>

                        <div className="register-benefits">
                            <div className="register-benefit-item">
                                <div className="register-benefit-icon">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <div className="register-benefit-title">7-day free trial</div>
                                    <div className="register-benefit-sub">No credit card required to start</div>
                                </div>
                            </div>
                            <div className="register-benefit-item">
                                <div className="register-benefit-icon">
                                    <Brain size={20} />
                                </div>
                                <div>
                                    <div className="register-benefit-title">AI-personalized from day one</div>
                                    <div className="register-benefit-sub">Adapts to your level in real time</div>
                                </div>
                            </div>
                            <div className="register-benefit-item">
                                <div className="register-benefit-icon">
                                    <XCircle size={20} />
                                </div>
                                <div>
                                    <div className="register-benefit-title">Cancel anytime, no strings</div>
                                    <div className="register-benefit-sub">No contracts, no hidden fees</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="register-left-testimonial">
                        <div className="register-testimonial-card">
                            <div className="register-stars">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={14} className="register-star-filled" />
                                ))}
                            </div>
                            <p className="register-testimonial-text">
                                "Best investment I've made in my health. Dropped 12kg in 3 months — the AI programming is genuinely next-level."
                            </p>
                            <div className="register-testimonial-author">
                                <img loading="lazy" 
                                    src="https://picsum.photos/seed/user-maria/80/80.jpg"
                                    alt="María"
                                    className="register-testimonial-avatar"
                                />
                                <div>
                                    <div className="register-testimonial-name">María González</div>
                                    <div className="register-testimonial-result">Lost 12kg · 3 months</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="register-left-decor-circle"></div>
                    <div className="register-left-decor-glow"></div>
                </div>

                {/* ═══ RIGHT PANEL ═══ */}
                <div className="register-right">
                    {/* Mobile Header */}
                    <div className="register-mobile-header">
                        <a href="/" className="register-logo register-logo-sm">
                            <div className="register-logo-icon register-logo-icon-sm">
                                <Zap size={16} color="#000" />
                            </div>
                            <span className="register-logo-text register-logo-text-sm">Fit<span className="text-power">Power</span></span>
                        </a>
                        <a href="/" className="register-back-link">← Back</a>
                    </div>

                    {/* Form Container */}
                    <div className="register-form-wrapper">
                        <div className="register-form-container">

                            {/* Back to Home */}
                            <a href="/" className="register-back-home">
                                <ArrowLeft size={14} /> Back to home
                            </a>

                            {/* Step Indicator */}
                            <div className="register-steps">
                                {[1, 2, 3].map((step) => (
                                    <div key={step} className="register-step-group">
                                        <div
                                            className={`register-step-dot ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'done' : ''}`}
                                        ></div>
                                        {step < 3 && (
                                            <div className={`register-step-line ${currentStep > step ? 'active' : ''}`}></div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Form Screen */}
                            <div className="register-form-screen">

                                {/* Step 1 */}
                                {currentStep === 1 && (
                                        <div className="register-step-content">
                                            <h1 className="register-title">Create your account</h1>
                                            <p className="register-subtitle">Start your 7-day free trial. No credit card needed.</p>

                                            {/* Name Fields */}
                                            <div className="register-name-grid">
                                                <div className="register-field">
                                                    <input
                                                        type="text"
                                                        className={`register-input ${touched.firstName ? (validateName(firstName) ? 'success' : 'error') : ''}`}
                                                        placeholder="First name"
                                                        value={firstName}
                                                        onChange={(e) => setFirstName(e.target.value)}
                                                        onBlur={() => handleBlur('firstName')}
                                                        autoComplete="given-name"
                                                    />
                                                    <User size={18} className="register-input-icon" />
                                                    {touched.firstName && !validateName(firstName) && (
                                                        <div className="register-field-error visible">First name is required</div>
                                                    )}
                                                </div>
                                                <div className="register-field">
                                                    <input
                                                        type="text"
                                                        className={`register-input ${touched.lastName ? (validateName(lastName) ? 'success' : 'error') : ''}`}
                                                        placeholder="Last name"
                                                        value={lastName}
                                                        onChange={(e) => setLastName(e.target.value)}
                                                        onBlur={() => handleBlur('lastName')}
                                                        autoComplete="family-name"
                                                    />
                                                    <User size={18} className="register-input-icon" />
                                                    {touched.lastName && !validateName(lastName) && (
                                                        <div className="register-field-error visible">Last name is required</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div className="register-field">
                                                <input
                                                    type="email"
                                                    className={`register-input ${touched.email ? (validateEmail(email) ? 'success' : 'error') : ''}`}
                                                    placeholder="Email address"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    onBlur={() => handleBlur('email')}
                                                    autoComplete="email"
                                                />
                                                <Mail size={18} className="register-input-icon" />
                                                {touched.email && !validateEmail(email) && (
                                                    <div className="register-field-error visible">Please enter a valid email</div>
                                                )}
                                            </div>

                                            {/* Password */}
                                            <div className="register-field">
                                                <input
                                                    ref={passInputRef}
                                                    type={passVisible ? 'text' : 'password'}
                                                    className={`register-input register-input-pass ${touched.password ? (validatePass(password) ? 'success' : 'error') : ''}`}
                                                    placeholder="Create password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    onBlur={() => handleBlur('password')}
                                                    autoComplete="new-password"
                                                />
                                                <Lock size={18} className="register-input-icon" />
                                                <button
                                                    type="button"
                                                    className="register-toggle-pass"
                                                    onClick={() => setPassVisible(!passVisible)}
                                                    aria-label="Toggle password visibility"
                                                >
                                                    {passVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                                {touched.password && !validatePass(password) && (
                                                    <div className="register-field-error visible">Password must be at least 8 characters</div>
                                                )}
                                            </div>

                                            {/* Password Strength */}
                                            {password && (
                                                <div className="register-strength-container">
                                                    <div className="register-strength-bar">
                                                        <div
                                                            className="register-strength-fill"
                                                            style={{ width: strength.width, background: strength.color }}
                                                        ></div>
                                                    </div>
                                                    <div className="register-strength-label" style={{ color: strength.color }}>
                                                        {strength.label}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Continue */}
                                            <button
                                                type="button"
                                                className="register-btn-primary btn-shine"
                                                onClick={handleToStep2}
                                            >
                                                Continue
                                            </button>

                                            <p className="register-login-link">
                                                Already have an account?
                                                <Link to="/login" className="register-login-link-accent">Log in</Link>
                                            </p>

                                            <div className="register-coach-link">
                                                <span className="register-coach-link-text">Are you a coach?</span>
                                                <Link to="/register/trainer" className="register-coach-link-accent">Sign up as trainer</Link>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2 */}
                                    {currentStep === 2 && (
                                        <div className="register-step-content">
                                            <button
                                                type="button"
                                                className="register-back-btn"
                                                onClick={() => goToStep(1)}
                                            >
                                                <ArrowLeft size={16} /> Back
                                            </button>
                                            <h1 className="register-title">Customize your experience</h1>
                                            <p className="register-subtitle">Help our AI build your perfect program from day one.</p>

                                            {/* Fitness Level */}
                                            <div className="register-select-group">
                                                <label className="register-select-label">Fitness level</label>
                                                <div className="register-level-grid">
                                                    {['beginner', 'intermediate', 'advanced'].map((level) => (
                                                        <button
                                                            key={level}
                                                            type="button"
                                                            className={`register-level-btn ${selectedLevel === level ? 'selected' : ''}`}
                                                            onClick={() => setSelectedLevel(level)}
                                                        >
                                                            {levelIcon(level)}
                                                            <span className="register-level-btn-text">{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Primary Goal */}
                                            <div className="register-select-group">
                                                <label className="register-select-label">Primary goal</label>
                                                <div className="register-goal-grid">
                                                    {[
                                                        { id: 'fat-loss', label: 'Fat Loss' },
                                                        { id: 'muscle', label: 'Build Muscle' },
                                                        { id: 'endurance', label: 'Endurance' },
                                                        { id: 'wellness', label: 'Wellness' },
                                                    ].map((goal) => (
                                                        <button
                                                            key={goal.id}
                                                            type="button"
                                                            className={`register-goal-btn ${selectedGoal === goal.id ? 'selected' : ''}`}
                                                            onClick={() => setSelectedGoal(goal.id)}
                                                        >
                                                            {goalIcon(goal.id)}
                                                            <div className="register-goal-btn-label">{goal.label}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Days per Week */}
                                            <div className="register-select-group">
                                                <label className="register-select-label">Training days per week</label>
                                                <div className="register-days-grid">
                                                    {[2, 3, 4, 5, 6].map((day) => (
                                                        <button
                                                            key={day}
                                                            type="button"
                                                            className={`register-day-btn ${selectedDays === String(day) ? 'selected' : ''}`}
                                                            onClick={() => setSelectedDays(String(day))}
                                                        >
                                                            {day}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="register-btn-primary btn-shine"
                                                onClick={handleToStep3}
                                            >
                                                Continue <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Step 3 */}
                                    {currentStep === 3 && (
                                        <div className="register-step-content">
                                            <button
                                                type="button"
                                                className="register-back-btn"
                                                onClick={() => goToStep(2)}
                                            >
                                                <ArrowLeft size={16} /> Back
                                            </button>
                                            <h1 className="register-title">Almost there</h1>
                                            <p className="register-subtitle">Review and confirm to start your free trial.</p>

                                            {/* Summary */}
                                            <div className="register-summary-card">
                                                <div className="register-summary-row">
                                                    <span className="register-summary-label">Name</span>
                                                    <span className="register-summary-value">{firstName} {lastName}</span>
                                                </div>
                                                <div className="register-summary-divider"></div>
                                                <div className="register-summary-row">
                                                    <span className="register-summary-label">Email</span>
                                                    <span className="register-summary-value">{email}</span>
                                                </div>
                                                <div className="register-summary-divider"></div>
                                                <div className="register-summary-row">
                                                    <span className="register-summary-label">Level</span>
                                                    <span className="register-summary-value register-summary-value-accent">{selectedLevel}</span>
                                                </div>
                                                <div className="register-summary-divider"></div>
                                                <div className="register-summary-row">
                                                    <span className="register-summary-label">Goal</span>
                                                    <span className="register-summary-value register-summary-value-accent">{formatGoal(selectedGoal)}</span>
                                                </div>
                                                <div className="register-summary-divider"></div>
                                                <div className="register-summary-row">
                                                    <span className="register-summary-label">Frequency</span>
                                                    <span className="register-summary-value">{selectedDays} days/week</span>
                                                </div>
                                            </div>

                                            {/* Terms */}
                                            <label className="register-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={termsAccepted}
                                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                                />
                                                <div className="register-checkbox-box">
                                                    <Check size={10} strokeWidth={3} />
                                                </div>
                                                <span className="register-checkbox-text">
                                                    I agree to the <a href="/contact" className="register-checkbox-link">Terms of Service</a> and <a href="/contact" className="register-checkbox-link">Privacy Policy</a>
                                                </span>
                                            </label>
                                            {!termsAccepted && (
                                                <div className="register-field-error visible" style={{ paddingLeft: 0, marginBottom: 16 }}>
                                                    You must accept the terms to continue
                                                </div>
                                            )}

                                            {/* Submit */}
                                            <button
                                                type="button"
                                                className="register-btn-primary btn-shine"
                                                onClick={handleSubmit}
                                                disabled={submitting}
                                            >
                                                {submitting ? (
                                                    <><span className="register-spinner"></span> Creating account...</>
                                                ) : (
                                                    'Start Free Trial'
                                                )}
                                            </button>
                                        </div>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="register-footer">
                        <p className="register-footer-text">© {new Date().getFullYear()} FitPower. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
