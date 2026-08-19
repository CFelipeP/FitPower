import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import {
    X, CheckCircle, SkipForward, Dumbbell, Flame, Trophy, Pause, Play, ChevronRight, ChevronLeft, Timer
} from 'lucide-react'
import {
    saveWorkoutSnapshot, clearWorkoutSnapshot, enqueueOp, isOnline
} from '../../lib/offlineQueue'
import './GuidedWorkout.css'

function parseReps(reps) {
    if (!reps) return ''
    const m = String(reps).match(/\d+/)
    return m ? m[0] : ''
}

function buildInitialState(session) {
    const exercises = (session.exercises || []).map((ex, i) => ({
        id: ex.id ?? i,
        name: ex.name,
        targetSets: ex.sets || 3,
        targetReps: ex.reps || '',
        targetWeight: ex.weight || '',
        notes: ex.notes || '',
        videoUrl: ex.videoUrl || '',
        imageUrl: ex.imageUrl || '',
        muscleGroup: ex.muscleGroup || '',
        equipment: ex.equipment || '',
        instructions: ex.instructions || '',
        doneSets: [],
        skipped: false,
        difficulty: null,
    }))
    return { exercises, current: 0, paused: false }
}

function restoreFromProgress(session) {
    const base = buildInitialState(session)
    try {
        const saved = JSON.parse(session.progress || 'null')
        if (saved && Array.isArray(saved.exercises)) {
            saved.exercises.forEach((se, i) => {
                if (base.exercises[i]) {
                    base.exercises[i].doneSets = se.doneSets || []
                    base.exercises[i].skipped = !!se.skipped
                    base.exercises[i].difficulty = se.difficulty ?? null
                }
            })
            if (Number.isInteger(saved.currentExercise)) base.current = saved.currentExercise
        }
    } catch { /* corrupt progress: start fresh */ }
    return base
}

export default function GuidedWorkout({ session, onClose, onFinished }) {
    const { showToast } = useToast()
    const [state, setState] = useState(() => restoreFromProgress(session))
    const [rpe, setRpe] = useState(session?.rpe || null)
    const [notes, setNotes] = useState('')
    const [finished, setFinished] = useState(false)
    const [finishing, setFinishing] = useState(false)
    const [summary, setSummary] = useState(null)
    const [restSeconds, setRestSeconds] = useState(60)
    const [restLeft, setRestLeft] = useState(0)
    const stateRef = useRef(state)
    useEffect(() => { stateRef.current = state }, [state])

    const persist = useCallback((nextState) => {
        const progress = {
            currentExercise: nextState.current,
            exercises: nextState.exercises.map(ex => ({
                id: ex.id,
                doneSets: ex.doneSets,
                skipped: ex.skipped,
                difficulty: ex.difficulty,
            })),
        }
        saveWorkoutSnapshot({
            sessionId: session.id,
            title: session.title,
            date: session.date,
            exercises: nextState.exercises,
            current: nextState.current,
        })
        const op = () => apiFetch(`/sessions/${session.id}/progress`, {
            method: 'PUT',
            body: JSON.stringify({ progress }),
        })
        if (isOnline()) {
            op().catch(() => enqueueOp({ method: 'PUT', endpoint: `/sessions/${session.id}/progress`, body: { progress } }))
        } else {
            enqueueOp({ method: 'PUT', endpoint: `/sessions/${session.id}/progress`, body: { progress } })
        }
    }, [session.id, session.title, session.date])

    // Mark the session as in progress (offline-safe).
    useEffect(() => {
        const markStarted = () => apiFetch(`/sessions/${session.id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'in_progress' }),
        })
        if (isOnline()) {
            markStarted().catch(() => enqueueOp({ method: 'PUT', endpoint: `/sessions/${session.id}`, body: { status: 'in_progress' } }))
        } else {
            enqueueOp({ method: 'PUT', endpoint: `/sessions/${session.id}`, body: { status: 'in_progress' } })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session.id])

    // Keep the local snapshot in sync with every state change.
    useEffect(() => {
        const t = setTimeout(() => persist(stateRef.current), 800)
        return () => clearTimeout(t)
    }, [state, persist])

    // Rest countdown
    useEffect(() => {
        if (restLeft <= 0) return
        const t = setInterval(() => {
            setRestLeft(s => {
                if (s <= 1) {
                    try {
                        const ctx = new (window.AudioContext || window.webkitAudioContext)()
                        const osc = ctx.createOscillator()
                        const gain = ctx.createGain()
                        osc.connect(gain)
                        gain.connect(ctx.destination)
                        gain.gain.setValueAtTime(0.15, ctx.currentTime)
                        osc.frequency.value = 880
                        osc.start()
                        osc.stop(ctx.currentTime + 0.25)
                    } catch { /* audio unavailable */ }
                    return 0
                }
                return s - 1
            })
        }, 1000)
        return () => clearInterval(t)
    }, [restLeft])

    const current = state.exercises[state.current]
    const completedExercises = state.exercises.filter(e => !e.skipped && e.doneSets.length >= e.targetSets).length
    const skippedCount = state.exercises.filter(e => e.skipped).length
    const totalSets = state.exercises.reduce((s, e) => s + e.targetSets, 0)
    const doneSets = state.exercises.reduce((s, e) => s + e.doneSets.length, 0)

    const updateExercise = (index, patch) => {
        setState(prev => {
            const exercises = prev.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e))
            return { ...prev, exercises }
        })
    }

    const checkSet = (reps, weight) => {
        updateExercise(state.current, { doneSets: [...current.doneSets, { reps, weight }] })
        setRestLeft(restSeconds)
    }

    const uncheckSet = (setIndex) => {
        updateExercise(state.current, { doneSets: current.doneSets.filter((_, i) => i !== setIndex) })
    }

    const skipExercise = () => {
        updateExercise(state.current, { skipped: true })
        moveNext()
    }

    const moveNext = () => {
        const next = state.current + 1
        if (next < state.exercises.length) {
            setState(prev => ({ ...prev, current: next }))
            setRestLeft(0)
        } else {
            setFinished(true)
        }
    }

    const movePrev = () => {
        setRestLeft(0)
        setState(prev => ({ ...prev, current: Math.max(0, prev.current - 1) }))
    }

    const handleFinish = async () => {
        if (!rpe) {
            showToast('Rate your effort (RPE) to finish')
            return
        }
        setFinishing(true)
        const performed = state.exercises
            .filter(e => !e.skipped && e.doneSets.length > 0)
            .map(e => ({
                name: e.name,
                sets: e.doneSets.length,
                reps: e.doneSets.map(s => s.reps || e.targetReps).join(','),
                weight: e.doneSets.map(s => s.weight || e.targetWeight).join(','),
                notes: e.notes,
            }))
        const finishOp = () => apiFetch('/workout-logs', {
            method: 'POST',
            body: JSON.stringify({ sessionId: session.id, exercises: performed }),
        })
        try {
            let result
            if (isOnline()) {
                try {
                    result = await finishOp()
                } catch {
                    enqueueOp({ method: 'POST', endpoint: '/workout-logs', body: { sessionId: session.id, exercises: performed } })
                    result = { queued: true, caloriesBurned: 0, streak: null, newAchievements: [] }
                }
            } else {
                enqueueOp({ method: 'POST', endpoint: '/workout-logs', body: { sessionId: session.id, exercises: performed } })
                result = { queued: true, caloriesBurned: 0, streak: null, newAchievements: [] }
            }
            await apiFetch(`/sessions/${session.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'completed', rpe, rpeNotes: notes || undefined }),
            }).catch(() => enqueueOp({ method: 'PUT', endpoint: `/sessions/${session.id}`, body: { status: 'completed', rpe, rpeNotes: notes || undefined } }))

            clearWorkoutSnapshot()
            setSummary({
                ...result,
                completedExercises,
                skippedCount,
                doneSets,
                rpe,
            })
            if (typeof onFinished === 'function') onFinished()
        } catch {
            showToast('Could not finish the workout. Your progress is saved — try again.')
        } finally {
            setFinishing(false)
        }
    }

    // ═══ SUMMARY SCREEN ═══
    if (summary) {
        return (
            <div className="gw-overlay">
                <div className="gw-card gw-summary-card">
                    <div className="gw-summary-icon"><CheckCircle size={44} /></div>
                    <h2 className="gw-summary-title">Workout Complete!</h2>
                    {summary.queued ? (
                        <p className="gw-summary-sub">You are offline — your workout will sync automatically when you reconnect.</p>
                    ) : (
                        <p className="gw-summary-sub">{session.title} is done. Great work!</p>
                    )}
                    <div className="gw-summary-grid">
                        <div className="gw-summary-item"><span className="gw-summary-value">{summary.completedExercises}/{state.exercises.length}</span><span className="gw-summary-label">Exercises</span></div>
                        <div className="gw-summary-item"><span className="gw-summary-value">{summary.doneSets}</span><span className="gw-summary-label">Sets done</span></div>
                        <div className="gw-summary-item"><span className="gw-summary-value">{summary.caloriesBurned ? summary.caloriesBurned : '—'}</span><span className="gw-summary-label">Kcal</span></div>
                        <div className="gw-summary-item"><span className="gw-summary-value">{summary.rpe}/10</span><span className="gw-summary-label">RPE</span></div>
                    </div>
                    {summary.streak != null && (
                        <p className="gw-summary-streak"><Flame size={16} /> Streak: {summary.streak} days</p>
                    )}
                    {(summary.newAchievements || []).length > 0 && (
                        <div className="gw-achievements">
                            {summary.newAchievements.map((a, i) => (
                                <div key={i} className="gw-achievement">
                                    <Trophy size={18} />
                                    <div>
                                        <div className="gw-achievement-title">Achievement unlocked: {a.label}</div>
                                        <div className="gw-achievement-sub">+{a.points} points</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {summary.skippedCount > 0 && (
                        <p className="gw-summary-skipped">{summary.skippedCount} exercise{summary.skippedCount > 1 ? 's' : ''} skipped this session.</p>
                    )}
                    <button className="gw-btn gw-btn-primary" onClick={onClose}>Back to Workouts</button>
                </div>
            </div>
        )
    }

    // ═══ FINISH CONFIRMATION ═══
    if (finished) {
        const remaining = state.exercises.filter(e => !e.skipped && e.doneSets.length === 0)
        return (
            <div className="gw-overlay">
                <div className="gw-card gw-summary-card">
                    <h2 className="gw-summary-title">Finish Workout?</h2>
                    <p className="gw-summary-sub">
                        {doneSets} of {totalSets} sets completed across {completedExercises} exercises.
                        {remaining.length > 0 && ` ${remaining.length} exercise${remaining.length > 1 ? 's' : ''} not started.`}
                    </p>
                    <div className="gw-finish-rpe">
                        <p className="gw-finish-label">How hard was it? (RPE)</p>
                        <div className="gw-rpe-buttons">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <button key={n} className={'gw-rpe-btn' + (rpe === n ? ' gw-rpe-selected' : '')} onClick={() => setRpe(n)}>{n}</button>
                            ))}
                        </div>
                    </div>
                    <textarea
                        className="gw-notes"
                        placeholder="Notes for this workout (optional)"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                    <div className="gw-summary-actions">
                        <button className="gw-btn" onClick={() => setFinished(false)}>Keep Training</button>
                        <button className="gw-btn gw-btn-primary" onClick={handleFinish} disabled={finishing}>
                            {finishing ? 'Saving...' : 'Finish & Save'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ═══ ACTIVE WORKOUT ═══
    return (
        <div className="gw-overlay">
            <div className="gw-shell">
                <header className="gw-header">
                    <div className="gw-header-info">
                        <h2 className="gw-title">{session.title}</h2>
                        <div className="gw-progress-text">
                            Exercise {state.current + 1} of {state.exercises.length} · {doneSets}/{totalSets} sets
                        </div>
                    </div>
                    <div className="gw-header-actions">
                        <button
                            className="gw-btn gw-btn-icon"
                            title={state.paused ? 'Resume' : 'Pause'}
                            onClick={() => setState(prev => ({ ...prev, paused: !prev.paused }))}
                        >
                            {state.paused ? <Play size={16} /> : <Pause size={16} />}
                        </button>
                        <button className="gw-btn gw-btn-icon" title="Close (progress is saved)" onClick={() => { persist(stateRef.current); onClose() }}>
                            <X size={16} />
                        </button>
                    </div>
                </header>

                <div className="gw-progress-bar">
                    <div className="gw-progress-fill" style={{ width: (doneSets / Math.max(totalSets, 1) * 100) + '%' }} />
                </div>

                {state.paused ? (
                    <div className="gw-paused">
                        <Pause size={28} />
                        <p>Workout paused. Your progress is saved — resume whenever you are ready.</p>
                        <button className="gw-btn gw-btn-primary" onClick={() => setState(prev => ({ ...prev, paused: false }))}>Resume</button>
                    </div>
                ) : (
                    <div className="gw-body">
                            <div className="gw-exercise-card">
                                <div className="gw-exercise-head">
                                    <div>
                                        <h3 className="gw-exercise-name"><Dumbbell size={18} /> {current.name}</h3>
                                        <p className="gw-exercise-target">Target: {current.targetSets} × {current.targetReps}{current.targetWeight ? ` @ ${current.targetWeight}` : ''}</p>
                                    </div>
                                    <span className="gw-exercise-count">{current.doneSets.length}/{current.targetSets} sets</span>
                                </div>
                                {current.videoUrl ? (
                                    <img
                                        className="gw-exercise-video"
                                        src={current.videoUrl}
                                        alt={current.name}
                                        loading="lazy"
                                    />
                                ) : current.imageUrl ? (
                                    <img
                                        className="gw-exercise-video"
                                        src={current.imageUrl}
                                        alt={current.name}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="gw-exercise-video gw-exercise-video-unavailable">
                                        <Dumbbell size={22} />
                                        <span>Video unavailable</span>
                                    </div>
                                )}
                                <div className="gw-exercise-meta">
                                    {current.muscleGroup && <span className="gw-meta-pill">Muscle: {current.muscleGroup}</span>}
                                    {current.equipment && <span className="gw-meta-pill">Equipment: {current.equipment}</span>}
                                </div>
                                {current.instructions && <p className="gw-exercise-instructions">{current.instructions}</p>}
                                {current.notes && <p className="gw-exercise-notes">{current.notes}</p>}

                            <div className="gw-sets">
                                {current.doneSets.map((s, i) => (
                                    <div key={i} className="gw-set gw-set-done">
                                        <CheckCircle size={14} />
                                        <span>Set {i + 1}</span>
                                        <span className="gw-set-detail">{s.reps || current.targetReps} reps{s.weight ? ` · ${s.weight}` : ''}</span>
                                        <button className="gw-set-undo" onClick={() => uncheckSet(i)}>undo</button>
                                    </div>
                                ))}
                                {current.doneSets.length < current.targetSets && (
                                    <NewSetRow
                                        key={current.doneSets.length}
                                        defaultReps={parseReps(current.targetReps)}
                                        defaultWeight={parseReps(current.targetWeight)}
                                        onCheck={checkSet}
                                    />
                                )}
                            </div>

                            {restLeft > 0 && (
                                <div className="gw-rest">
                                    <Timer size={16} />
                                    <span>Rest: {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}</span>
                                    <button className="gw-btn gw-btn-sm" onClick={() => setRestLeft(0)}>Skip rest</button>
                                </div>
                            )}

                            <div className="gw-exercise-actions">
                                <button className="gw-btn gw-btn-sm" onClick={skipExercise}>
                                    <SkipForward size={14} /> Skip exercise
                                </button>
                                <label className="gw-rest-label">
                                    Rest
                                    <select value={restSeconds} onChange={e => setRestSeconds(Number(e.target.value))}>
                                        {[30, 45, 60, 90, 120].map(s => <option key={s} value={s}>{s}s</option>)}
                                    </select>
                                </label>
                            </div>
                        </div>

                        <div className="gw-nav">
                            <button className="gw-btn" onClick={movePrev} disabled={state.current === 0}>
                                <ChevronLeft size={16} /> Previous
                            </button>
                            <button
                                className="gw-btn gw-btn-primary"
                                onClick={moveNext}
                                disabled={!current.skipped && current.doneSets.length < current.targetSets}
                            >
                                {state.current === state.exercises.length - 1 ? 'Finish Workout' : 'Next Exercise'} <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function NewSetRow({ defaultReps, defaultWeight, onCheck }) {
    const [reps, setReps] = useState(defaultReps)
    const [weight, setWeight] = useState(defaultWeight)
    return (
        <div className="gw-set gw-set-new">
            <span className="gw-set-num">Next set</span>
            <input className="gw-input gw-input-reps" inputMode="numeric" placeholder="Reps" value={reps} onChange={e => setReps(e.target.value)} />
            <input className="gw-input gw-input-weight" inputMode="numeric" placeholder="Kg" value={weight} onChange={e => setWeight(e.target.value)} />
            <button className="gw-btn gw-btn-sm gw-btn-check" onClick={() => onCheck(reps, weight)}>
                <CheckCircle size={14} /> Done
            </button>
        </div>
    )
}
