import { useState, useEffect, useCallback } from 'react'
import { Dumbbell, Clock, CheckCircle, Target, RotateCw } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { swalError } from '../../lib/alerts'
import { useToast } from '../../context/ToastContext'
import './SmartRoutine.css'

export default function SmartRoutine() {
    const { showToast } = useToast()
    const [routine, setRoutine] = useState(null)
    const [loading, setLoading] = useState(true)
    const [completing, setCompleting] = useState(false)
    const [locked, setLocked] = useState(false)

    const loadRoutine = useCallback(async () => {
        try {
            const data = await apiFetch('/routines/daily')
            setRoutine(data)
        } catch (e) {
            if (e?.code === 'FEATURE_NOT_AVAILABLE' || (e?.status === 403)) {
                setRoutine(null)
                setLocked(true)
                return
            }
            swalError('Error loading routine')
        }
    }, [showToast])

    useEffect(() => {
        loadRoutine().finally(() => setLoading(false))
    }, [loadRoutine])

    if (locked) {
        return (
            <div className="sr-card sr-locked">
                <Target size={28} className="sr-locked-icon" />
                <h3 className="sr-locked-title">AI-powered programming</h3>
                <p className="sr-locked-desc">Your daily smart routine is generated with the Pro plan. Upgrade to unlock it.</p>
                <a className="sr-locked-btn" href="/plans">Upgrade to Pro</a>
            </div>
        )
    }

    const completeRoutine = async () => {
        setCompleting(true)
        try {
            const res = await apiFetch('/routines/complete', { method: 'POST', body: JSON.stringify({}) })
            showToast('Routine completed! +20 points')
            const unlocked = res?.newAchievements || []
            unlocked.forEach(a => showToast(`Trophy unlocked: ${a.label} (+${a.points} pts)`))
            loadRoutine()
        } catch (e) { swalError(e.message) }
        setCompleting(false)
    }

    if (loading) return <div className="sr-card"><div className="sr-loading">Generating your smart routine...</div></div>

    return (
        <div className="sr-card">
            <div className="sr-header">
                <div className="sr-title-row">
                    <Dumbbell className="sr-icon" />
                    <div>
                        <h3 className="sr-title">Today's Routine</h3>
                        <p className="sr-subtitle">{routine?.title || 'Powered by FitPower AI'}</p>
                    </div>
                </div>
                <div className="sr-meta">
                    <span className="sr-badge"><Clock size={12} /> {routine?.duration_minutes || 0} min</span>
                    <span className="sr-badge sr-badge-yellow"><Target size={12} /> {routine?.focus || ''}</span>
                    {routine?.is_completed ? (
                        <span className="sr-badge sr-badge-green"><CheckCircle size={12} /> Completed</span>
                    ) : (
                        <span className="sr-badge sr-badge-dim">{routine?.difficulty || ''}</span>
                    )}
                </div>
            </div>
            <div className="sr-exercises">
                {(routine?.exercises || []).map((ex, i) => (
                    <div key={i} className="sr-exercise">
                        <div className="sr-ex-num">{i + 1}</div>
                        <div className="sr-ex-info">
                            <div className="sr-ex-name">{ex.name}</div>
                            <div className="sr-ex-detail">{ex.sets} × {ex.reps} · {ex.rest}s rest</div>
                        </div>
                    </div>
                ))}
            </div>
            {!routine?.is_completed && (
                <button className="sr-complete-btn" onClick={completeRoutine} disabled={completing}>
                    <CheckCircle size={18} /> {completing ? 'Completing...' : 'Mark as Completed'}
                </button>
            )}
            <button className="sr-refresh" onClick={loadRoutine}><RotateCw size={14} /> New routine</button>
        </div>
    )
}
