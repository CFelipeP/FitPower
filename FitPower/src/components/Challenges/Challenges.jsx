import { useState, useEffect, useCallback } from 'react'
import { Target, Users, CalendarDays, Trophy, Plus, Zap, Timer, Dumbbell, Utensils, Brain, CheckCircle, X, Star } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import './Challenges.css'

const categoryMeta = {
    strength: { label: 'Strength', icon: Dumbbell, color: 'var(--power-500)' },
    cardio: { label: 'Cardio', icon: Timer, color: '#4ade80' },
    nutrition: { label: 'Nutrition', icon: Utensils, color: '#f97316' },
    mindset: { label: 'Mindset', icon: Brain, color: '#a78bfa' },
    habit: { label: 'Habit', icon: Zap, color: '#38bdf8' },
}

const goalTypeLabels = {
    reps: 'Reps',
    minutes: 'Minutes',
    days: 'Days',
    distance: 'Distance',
    weight: 'Weight',
    custom: 'Custom',
}

export default function Challenges() {
    const { showToast } = useToast()
    const [challenges, setChallenges] = useState([])
    const [loading, setLoading] = useState(true)

    const loadChallenges = useCallback(async () => {
        try {
            const data = await apiFetch('/challenges')
            setChallenges(data)
        } catch { showToast('Error loading challenges') }
        finally { setLoading(false) }
    }, [showToast])

    useEffect(() => { loadChallenges() }, [loadChallenges])

    async function handleJoin(id) {
        try {
            await apiFetch(`/challenges/${id}/join`, { method: 'POST' })
            showToast('You joined the challenge')
            await loadChallenges()
        } catch (e) { showToast(e.message) }
    }

    async function handleLeave(id) {
        try {
            await apiFetch(`/challenges/${id}/leave`, { method: 'POST' })
            showToast('You left the challenge')
            await loadChallenges()
        } catch (e) { showToast(e.message) }
    }

    async function handleProgress(id, current) {
        try {
            await apiFetch(`/challenges/${id}/progress`, {
                method: 'PUT',
                body: JSON.stringify({ progress: current + 1 }),
            })
            await loadChallenges()
        } catch (e) { showToast(e.message) }
    }

    function daysRemaining(endDate) {
        const now = new Date()
        const end = new Date(endDate)
        const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
        return diff > 0 ? diff : 0
    }

    if (loading) {
        return (
            <div className="ch-wrap">
                <div className="ch-loading"><div className="ch-spinner" /></div>
            </div>
        )
    }

    if (!challenges.length) {
        return (
            <div className="ch-wrap">
                <div className="ch-empty">
                    <Target size={48} />
                    <p>No challenges available right now.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="ch-wrap">
            <div className="ch-header">
                <div className="ch-header-left">
                    <Target size={20} />
                    <h2 className="ch-title">Challenges</h2>
                    <span className="ch-count">{challenges.length} challenges</span>
                </div>
            </div>

            <div className="ch-grid">
                {challenges.map(ch => {
                    const cat = categoryMeta[ch.category] || categoryMeta.strength
                    const CatIcon = cat.icon
                    const remaining = daysRemaining(ch.end_date)

                    return (
                        <div key={ch.id} className={'ch-card' + (ch.is_featured ? ' ch-featured' : '')}>
                            {ch.is_featured && (
                                <div className="ch-featured-badge">
                                    <Star size={12} /> Featured
                                </div>
                            )}

                            <div className="ch-card-top">
                                <div className="ch-category-tag" style={{ '--cat-color': cat.color }}>
                                    <CatIcon size={14} />
                                    <span>{cat.label}</span>
                                </div>
                                <span className={'ch-status ch-status-' + ch.status}>{ch.status}</span>
                            </div>

                            <h3 className="ch-card-title">{ch.title}</h3>
                            {ch.description && <p className="ch-card-desc">{ch.description}</p>}

                            <div className="ch-card-meta">
                                <div className="ch-meta-item">
                                    <CalendarDays size={14} />
                                    <span>{ch.start_date} → {ch.end_date}</span>
                                </div>
                                <div className="ch-meta-item">
                                    <Target size={14} />
                                    <span>{goalTypeLabels[ch.goal_type]}: {ch.goal_value}</span>
                                </div>
                                <div className="ch-meta-item">
                                    <Users size={14} />
                                    <span>{ch.participant_count}{ch.max_participants ? '/' + ch.max_participants : ''} participants</span>
                                </div>
                                {ch.reward && (
                                    <div className="ch-meta-item ch-reward">
                                        <Trophy size={14} />
                                        <span>{ch.reward}</span>
                                    </div>
                                )}
                                <div className="ch-meta-item ch-time">
                                    <Timer size={14} />
                                    <span>{remaining}d remaining</span>
                                </div>
                            </div>

                            {ch.joined && (
                                <div className="ch-progress-section">
                                    <div className="ch-progress-header">
                                        <span className="ch-progress-label">Progress</span>
                                        <span className="ch-progress-value">{ch.user_progress} / {ch.goal_value}</span>
                                    </div>
                                    <div className="ch-progress-track">
                                        <div
                                            className="ch-progress-fill"
                                            style={{ width: Math.min(100, (ch.user_progress / (ch.goal_value || 1)) * 100) + '%' }}
                                        />
                                    </div>
                                    {ch.status === 'active' && (
                                        <button className="ch-progress-btn" onClick={() => handleProgress(ch.id, ch.user_progress)}>
                                            <Plus size={14} /> +1
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="ch-card-actions">
                                {ch.joined ? (
                                    <button className="ch-btn ch-btn-leave" onClick={() => handleLeave(ch.id)}>
                                        <X size={14} /> Leave
                                    </button>
                                ) : (
                                    <button className="ch-btn ch-btn-join" onClick={() => handleJoin(ch.id)}>
                                        <CheckCircle size={14} /> Join
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
