import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import {
    Dumbbell, Calendar, Heart,
    ChevronRight, ChevronLeft, Check,
    Flame, Sparkles
} from 'lucide-react'
import './OnboardingWizard.css'

const STEPS = [
    { id: 1, title: 'Your Goals', description: 'What do you want to achieve?' },
    { id: 2, title: 'Experience Level', description: 'How would you describe your fitness level?' },
    { id: 3, title: 'Training Schedule', description: 'How many days per week can you train?' },
    { id: 4, title: 'Almost Done', description: 'Review your selections and confirm' },
]

const GOALS = [
    { id: 'fat-loss', label: 'Fat Loss', icon: Flame, desc: 'Burn fat and reveal definition' },
    { id: 'muscle', label: 'Build Muscle', icon: Dumbbell, desc: 'Increase strength and size' },
    { id: 'endurance', label: 'Endurance', icon: Heart, desc: 'Boost stamina and cardio' },
    { id: 'wellness', label: 'Wellness', icon: Sparkles, desc: 'Feel better and stay active' },
]

const LEVELS = [
    { id: 'beginner', label: 'Beginner', desc: 'New to fitness or returning after a long break' },
    { id: 'intermediate', label: 'Intermediate', desc: 'Training consistently for 6+ months' },
    { id: 'advanced', label: 'Advanced', desc: 'Experienced with structured programs' },
]

const DAYS = [2, 3, 4, 5, 6, 7]

function decodeToken(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.sub || null
    } catch {
        return null
    }
}

export default function OnboardingWizard() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const [step, setStep] = useState(1)
    const [primaryGoal, setPrimaryGoal] = useState('')
    const [fitnessLevel, setFitnessLevel] = useState('')
    const [trainingDays, setTrainingDays] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [direction, setDirection] = useState('next')

    useEffect(() => {
        const token = localStorage.getItem('token')
        const role = localStorage.getItem('role')
        if (!token) { navigate('/login'); return }
        const userId = decodeToken(token)
        if (!userId) return
        apiFetch(`/users/${userId}`).then(user => {
            if (user.fitnessLevel && user.primaryGoal && user.trainingDays) {
                navigate(role === 'admin' ? '/admin/dashboard' : '/client/dashboard')
            }
        }).catch(() => {})
    }, [navigate])

    const handleNext = () => {
        if (step === 1 && !primaryGoal) { showToast('Please select a primary goal'); return }
        if (step === 2 && !fitnessLevel) { showToast('Please select your fitness level'); return }
        if (step === 3 && !trainingDays) { showToast('Please select training days'); return }
        setDirection('next')
        setStep((s) => s + 1)
    }

    const handleBack = () => {
        setDirection('prev')
        setStep((s) => s - 1)
    }

    const handleSubmit = async () => {
        const token = localStorage.getItem('token')
        if (!token) { showToast('Session expired. Please log in again.'); return }
        const userId = decodeToken(token)
        if (!userId) { showToast('Invalid session'); return }
        setSubmitting(true)
        try {
            await apiFetch(`/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({ fitnessLevel, primaryGoal, trainingDays }),
            })
            showToast('Profile completed!')
            const role = localStorage.getItem('role')
            navigate(role === 'admin' ? '/admin/dashboard' : '/client/dashboard')
        } catch (err) {
            showToast(err.message || 'Failed to save profile')
        } finally {
            setSubmitting(false)
        }
    }

    const goalIcon = (goalId) => {
        const goal = GOALS.find((g) => g.id === goalId)
        if (!goal) return null
        const Icon = goal.icon
        return <Icon size={28} className="ow-goal-icon" />
    }

    const formatGoal = (g) => g ? g.replace('-', ' ') : ''

    return (
        <div className="ow-overlay">
            <div className="ow-card">
                {/* Progress Dots */}
                <div className="ow-progress">
                    {STEPS.map((s) => (
                        <div key={s.id} className="ow-progress-group">
                            <div
                                className={`ow-dot ${step === s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}
                            />
                            {s.id < STEPS.length && (
                                <div className={`ow-line ${step > s.id ? 'active' : ''}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className={`ow-step ow-step-${direction}`} key={step}>
                    {step < 4 && (
                        <div className="ow-header">
                            <h2 className="ow-title">{STEPS[step - 1].title}</h2>
                            <p className="ow-desc">{STEPS[step - 1].description}</p>
                        </div>
                    )}

                    {/* Step 1 — Goals */}
                    {step === 1 && (
                        <div className="ow-grid ow-grid-2">
                            {GOALS.map((goal) => {
                                const Icon = goal.icon
                                return (
                                    <button
                                        key={goal.id}
                                        className={`ow-option-card ${primaryGoal === goal.id ? 'selected' : ''}`}
                                        onClick={() => setPrimaryGoal(goal.id)}
                                    >
                                        <Icon size={32} className="ow-option-icon" />
                                        <span className="ow-option-label">{goal.label}</span>
                                        <span className="ow-option-desc">{goal.desc}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* Step 2 — Fitness Level */}
                    {step === 2 && (
                        <div className="ow-grid">
                            {LEVELS.map((level) => (
                                <button
                                    key={level.id}
                                    className={`ow-option-row ${fitnessLevel === level.id ? 'selected' : ''}`}
                                    onClick={() => setFitnessLevel(level.id)}
                                >
                                    <div className="ow-option-radio">
                                        {fitnessLevel === level.id && <div className="ow-radio-dot" />}
                                    </div>
                                    <div className="ow-option-text">
                                        <span className="ow-option-label">{level.label}</span>
                                        <span className="ow-option-desc">{level.desc}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 3 — Days */}
                    {step === 3 && (
                        <div>
                            <div className="ow-days-grid">
                                {DAYS.map((day) => (
                                    <button
                                        key={day}
                                        className={`ow-day-btn ${trainingDays === String(day) ? 'selected' : ''}`}
                                        onClick={() => setTrainingDays(String(day))}
                                    >
                                        <span className="ow-day-num">{day}</span>
                                        <span className="ow-day-label">{day === 1 ? 'day' : 'days'}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="ow-days-hint">
                                {trainingDays ? `${trainingDays} days per week` : 'Tap a number above'}
                            </div>
                        </div>
                    )}

                    {/* Step 4 — Summary */}
                    {step === 4 && (
                        <div className="ow-summary">
                            <div className="ow-check-circle">
                                <Check size={32} />
                            </div>
                            <h2 className="ow-title ow-title-center">{STEPS[3].title}</h2>
                            <p className="ow-desc ow-desc-center">{STEPS[3].description}</p>

                            <div className="ow-summary-card">
                                <div className="ow-summary-item">
                                    <span className="ow-summary-label">Goal</span>
                                    <span className="ow-summary-value">{formatGoal(primaryGoal)}</span>
                                    {goalIcon(primaryGoal)}
                                </div>
                                <div className="ow-summary-divider" />
                                <div className="ow-summary-item">
                                    <span className="ow-summary-label">Level</span>
                                    <span className="ow-summary-value">{fitnessLevel}</span>
                                </div>
                                <div className="ow-summary-divider" />
                                <div className="ow-summary-item">
                                    <span className="ow-summary-label">Training</span>
                                    <span className="ow-summary-value">{trainingDays} days / week</span>
                                    <Calendar size={18} className="ow-summary-icon" />
                                </div>
                            </div>

                            <button
                                className="ow-submit-btn"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <span className="ow-spinner" />
                                ) : (
                                    <>
                                        <Check size={18} /> Confirm Profile
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="ow-nav">
                    {step > 1 ? (
                        <button className="ow-nav-btn ow-back" onClick={handleBack}>
                            <ChevronLeft size={18} /> Back
                        </button>
                    ) : (
                        <div />
                    )}
                    {step < 4 ? (
                        <button className="ow-nav-btn ow-next" onClick={handleNext}>
                            Next <ChevronRight size={18} />
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
