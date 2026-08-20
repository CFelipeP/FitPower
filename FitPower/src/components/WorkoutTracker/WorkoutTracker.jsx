import { useState, useEffect, useCallback, Fragment } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { confirmSwal, swalError } from '../../lib/alerts'
import {
    CheckCircle, Dumbbell, Clock, Flame, Plus, X, Trash2, ChevronDown, ChevronUp, ClipboardList, Activity, Timer, Play
} from 'lucide-react'
import RestTimer from '../RestTimer/RestTimer'
import GuidedWorkout from '../GuidedWorkout/GuidedWorkout'
import ExercisePicker from '../ExerciseLibrary/ExercisePicker'
import { useAuth } from '../../context/AuthContext'
import { getWorkoutSnapshot, clearWorkoutSnapshot } from '../../lib/offlineQueue'
import './WorkoutTracker.css'

const emptyExercise = { name: '', sets: '', reps: '', weight: '', notes: '', exerciseId: '' }

export default function WorkoutTracker() {
    const { showToast } = useToast()
    const { user } = useAuth()
    const isClient = (user?.role || 'client') === 'client'
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    const [activeTab, setActiveTab] = useState('all')
    const [showNewForm, setShowNewForm] = useState(false)
    const [showAddExercise, setShowAddExercise] = useState(null)
    const [restTimerExercise, setRestTimerExercise] = useState(null)
    const [activeSession, setActiveSession] = useState(null)
    const [resumeSnapshot, setResumeSnapshot] = useState(null)

    const [newSession, setNewSession] = useState({
        title: '', date: '', description: '', type: 'strength'
    })
    const [newExercises, setNewExercises] = useState([])
    const [exerciseForm, setExerciseForm] = useState({ ...emptyExercise })

    const loadSessions = useCallback(async () => {
        try {
            const data = await apiFetch('/sessions')
            setSessions(data)
        } catch {
            showToast('Error loading sessions')
        } finally {
            setLoading(false)
        }
    }, [showToast])

    useEffect(() => {
        apiFetch('/sessions').then(setSessions).catch(() => showToast('Error loading sessions')).finally(() => setLoading(false))
    }, [showToast])

    // Interrupted workout recovery: if a local snapshot exists, offer to resume.
    useEffect(() => {
        const snapshot = getWorkoutSnapshot()
        if (!snapshot) return
        apiFetch('/sessions')
            .then(list => {
                const match = list.find(s => s.id === snapshot.sessionId)
                if (match && !match.progressCompleted) {
                    setResumeSnapshot({ snapshot, session: match })
                } else {
                    clearWorkoutSnapshot()
                }
            })
            .catch(() => {
                // Offline: still allow resuming from the local snapshot.
                setResumeSnapshot({ snapshot, session: { id: snapshot.sessionId, title: snapshot.title || 'Unfinished workout', exercises: snapshot.exercises || [], date: snapshot.date } })
            })
    }, [showToast])

    function startSession(session) {
        setResumeSnapshot(null)
        setActiveSession(session)
    }

    function discardResume() {
        clearWorkoutSnapshot()
        setResumeSnapshot(null)
        const sessionId = resumeSnapshot?.snapshot?.sessionId
        if (sessionId) {
            apiFetch(`/sessions/${sessionId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'scheduled' }),
            }).catch(() => {})
        }
        loadSessions()
    }

    async function handleRpeRating(sessionId, rating) {
        try {
            await apiFetch(`/sessions/${sessionId}`, {
                method: 'PUT',
                body: JSON.stringify({ rpe: rating })
            })
            showToast('RPE registered!')
            loadSessions()
        } catch {
            showToast('Error saving RPE')
        }
    }

    async function completeSession(id) {
        try {
            await apiFetch(`/sessions/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'completed' })
            })
            showToast('Workout completed!')
            loadSessions()
        } catch {
            showToast('Error completing session')
        }
    }

    async function deleteExercise(sessionId, exerciseId) {
        if (!(await confirmSwal('Remove this exercise from the session?', 'Delete exercise?'))) return
        try {
            await apiFetch(`/sessions/${sessionId}/exercises/${exerciseId}`, {
                method: 'DELETE'
            })
            showToast('Exercise deleted')
            loadSessions()
        } catch {
            swalError('Error deleting exercise')
        }
    }

    async function moveExercise(sessionId, index, dir) {
        const session = sessions.find(s => s.id === sessionId)
        const list = [...(session?.exercises || [])]
        const to = index + dir
        if (to < 0 || to >= list.length) return
        ;[list[index], list[to]] = [list[to], list[index]]
        try {
            await apiFetch(`/sessions/${sessionId}/exercises/order`, {
                method: 'PUT',
                body: JSON.stringify({ order: list.map(e => e.id) })
            })
            showToast('Order saved')
            loadSessions()
        } catch {
            swalError('Could not save order')
        }
    }

    async function handleAddExercise(sessionId) {
        if (!exerciseForm.name.trim()) {
            showToast('Exercise name is required')
            return
        }
        try {
            await apiFetch(`/sessions/${sessionId}/exercises`, {
                method: 'POST',
                body: JSON.stringify(exerciseForm)
            })
            setExerciseForm({ ...emptyExercise })
            setShowAddExercise(null)
            showToast('Exercise added')
            loadSessions()
        } catch {
            showToast('Error adding exercise')
        }
    }

    function handleNewExerciseChange(field, value) {
        // Manual name edit breaks the catalog link — drop it to avoid a mismatched reference.
        const next = field === 'name' ? { ...exerciseForm, name: value, exerciseId: '' } : { ...exerciseForm, [field]: value }
        setExerciseForm(next)
    }

    function pickCatalogExercise(ex) {
        setExerciseForm(prev => ({ ...prev, name: ex.name, exerciseId: ex.id }))
    }

    function addExerciseToList() {
        if (!exerciseForm.name.trim()) {
            showToast('Exercise name is required')
            return
        }
        setNewExercises(prev => [...prev, { ...exerciseForm }])
        setExerciseForm({ ...emptyExercise })
    }

    function removeExerciseFromList(idx) {
        setNewExercises(prev => prev.filter((_, i) => i !== idx))
    }

    async function handleCreateSession() {
        if (!newSession.title.trim() || !newSession.date) {
            showToast('Title and date are required')
            return
        }
        try {
            await apiFetch('/sessions', {
                method: 'POST',
                body: JSON.stringify({
                    ...newSession,
                    exercises: newExercises
                })
            })
            setNewSession({ title: '', date: '', description: '', type: 'strength' })
            setNewExercises([])
            setShowNewForm(false)
            showToast('Session created!')
            loadSessions()
        } catch {
            showToast('Error creating session')
        }
    }

    const filteredSessions = sessions.filter(s => {
        if (activeTab === 'all') return true
        if (activeTab === 'scheduled') return !s.progressCompleted && (s.status === 'scheduled' || s.status === 'in_progress')
        if (activeTab === 'completed') return s.progressCompleted
        return true
    })

    function toggleExpand(id) {
        setExpandedId(prev => prev === id ? null : id)
    }

    function getStatusLabel(session) {
        // Completion is per-user (progressCompleted), not the shared session status.
        if (session.progressCompleted) return { label: 'Completed', cls: 'wt-status-completed' }
        const status = session.status
        if (status === 'in_progress') return { label: 'In Progress', cls: 'wt-status-inprogress' }
        return { label: 'Scheduled', cls: 'wt-status-scheduled' }
    }

    if (loading) {
        return (
            <div className="workout-tracker">
                <div className="wt-loading">
                    <div className="wt-spinner" />
                </div>
            </div>
        )
    }

    return (
        <div className="workout-tracker">
            <div className="wt-header">
                <h1>
                    <Dumbbell />
                    Workout Tracker
                </h1>
                <button className="wt-btn" onClick={() => setShowNewForm(true)}>
                    <Plus /> Log Workout
                </button>
            </div>

            <div className="wt-tabs">
                <button
                    className={'wt-tab' + (activeTab === 'all' ? ' wt-active' : '')}
                    onClick={() => setActiveTab('all')}
                >
                    All
                </button>
                <button
                    className={'wt-tab' + (activeTab === 'scheduled' ? ' wt-active' : '')}
                    onClick={() => setActiveTab('scheduled')}
                >
                    Scheduled
                </button>
                <button
                    className={'wt-tab' + (activeTab === 'completed' ? ' wt-active' : '')}
                    onClick={() => setActiveTab('completed')}
                >
                    Completed
                </button>
            </div>

            {resumeSnapshot && (
                <div className="wt-resume-banner">
                    <div className="wt-resume-info">
                        <Clock size={16} />
                        <div>
                            <div className="wt-resume-title">We found an unfinished workout</div>
                            <div className="wt-resume-sub">{resumeSnapshot.session.title || 'Workout session'}</div>
                        </div>
                    </div>
                    <div className="wt-resume-actions">
                        <button className="wt-btn wt-btn-sm" onClick={discardResume}>Discard</button>
                        <button className="wt-btn wt-btn-sm" style={{ background: 'var(--power-500)', color: '#111', border: 'none' }} onClick={() => startSession(resumeSnapshot.session)}>
                            <Play style={{ width: 12, height: 12 }} /> Continue
                        </button>
                    </div>
                </div>
            )}

            {filteredSessions.length === 0 ? (
                <div className="wt-empty">
                    <ClipboardList />
                    <p>No sessions to show</p>
                </div>
            ) : (
                <div className="wt-session-list">
                    {filteredSessions.map(session => {
                        const statusInfo = getStatusLabel(session)
                        const isExpanded = expandedId === session.id
                        const exercises = session.exercises || []
                        return (
                            <div
                                key={session.id}
                                className={'wt-session-card' + (isExpanded ? ' wt-expanded' : '')}
                                onClick={() => toggleExpand(session.id)}
                            >
                                <div className="wt-session-top">
                                    <div className="wt-session-info">
                                        <div className="wt-session-title">{session.title}</div>
                                        <div className="wt-session-meta">
                                            <span><Clock />{session.date || '—'}</span>
                                            {session.trainer && <span><Dumbbell />{session.trainer}</span>}
                                            {session.type && <span><Flame />{session.type}</span>}
                                        </div>
                                    </div>
                                    <span className={'wt-status ' + statusInfo.cls}>
                                        {session.progressCompleted ? <CheckCircle /> : <Clock />}
                                        {statusInfo.label}
                                    </span>
                                    <ChevronDown className={'wt-chevron' + (isExpanded ? ' wt-open' : '')} />
                                </div>

                                {isExpanded && (
                                    <div className="wt-session-body">
                                        {session.description && (
                                            <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>
                                                {session.description}
                                            </p>
                                        )}

                                        <div className="wt-exercise-list">
                                            {exercises.map((ex, exIndex) => (
                                                <Fragment key={ex.id}>
                                                <div className="wt-exercise-item">
                                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                                        {(ex.videoUrl || ex.imageUrl) ? (
                                                            <img
                                                                src={ex.videoUrl || ex.imageUrl}
                                                                alt={ex.name}
                                                                loading="lazy"
                                                                className="wt-exercise-thumb"
                                                            />
                                                        ) : (
                                                            <div className="wt-exercise-thumb wt-exercise-thumb-empty">
                                                                <Dumbbell size={14} />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="wt-exercise-name">
                                                                <Dumbbell />
                                                                {ex.name}
                                                            </div>
                                                            <div className="wt-exercise-detail">
                                                                <span>{ex.sets} × {ex.reps} @ {ex.weight}</span>
                                                                {ex.muscleGroup && <span className="wt-exercise-meta-pill">{ex.muscleGroup}</span>}
                                                                {ex.equipment && <span className="wt-exercise-meta-pill">{ex.equipment}</span>}
                                                            </div>
                                                            {ex.notes && (
                                                                <div className="wt-exercise-notes">{ex.notes}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{display:'flex',gap:4,alignItems:'flex-start'}}>
                                                        {!isClient && (
                                                            <>
                                                                <button
                                                                    className="wt-btn wt-btn-sm wt-btn-outline"
                                                                    title="Move up"
                                                                    disabled={exIndex === 0}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        moveExercise(session.id, exIndex, -1)
                                                                    }}
                                                                >
                                                                    <ChevronUp style={{ width: 12, height: 12 }} />
                                                                </button>
                                                                <button
                                                                    className="wt-btn wt-btn-sm wt-btn-outline"
                                                                    title="Move down"
                                                                    disabled={exIndex === exercises.length - 1}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        moveExercise(session.id, exIndex, 1)
                                                                    }}
                                                                >
                                                                    <ChevronDown style={{ width: 12, height: 12 }} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            className="wt-btn wt-btn-sm"
                                                            style={{background:'rgba(255,214,0,.1)',color:'var(--power-500)',border:'1px solid rgba(255,214,0,.2)'}}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setRestTimerExercise(restTimerExercise === ex.id ? null : ex.id)
                                                            }}
                                                            title="Rest Timer"
                                                        >
                                                            <Timer style={{ width: 12, height: 12 }} />
                                                        </button>
                                                        {!isClient && (
                                                        <button
                                                            className="wt-btn wt-btn-danger wt-btn-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                deleteExercise(session.id, ex.id)
                                                            }}
                                                        >
                                                            <Trash2 style={{ width: 12, height: 12 }} />
                                                        </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {restTimerExercise === ex.id && (
                                                    <div style={{marginTop:8,padding:'8px 12px',background:'rgba(255,255,255,.02)',borderRadius:8}} onClick={e => e.stopPropagation()}>
                                                        <RestTimer onTimerEnd={() => {}} />
                                                    </div>
                                                )}
                                                </Fragment>
                                            ))}
                                        </div>

                                        {session.status === 'completed' && !session.rpe && (
                                            <div className="session-rpe-section">
                                                <h4 className="session-rpe-title">How was this workout?</h4>
                                                <p className="session-rpe-subtitle">Rate your perceived exertion (1 = very light, 10 = max effort)</p>
                                                <div className="session-rpe-buttons">
                                                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                                        <button
                                                            key={n}
                                                            className={`session-rpe-btn ${session.rpe === n ? 'selected' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleRpeRating(session.id, n)
                                                            }}
                                                        >
                                                            {n}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {session.rpe && (
                                            <div className="session-rpe-display">
                                                <Activity size={16} />
                                                <span>RPE: <strong>{session.rpe}/10</strong></span>
                                                {session.rpe_notes && <span className="session-rpe-notes">— {session.rpe_notes}</span>}
                                            </div>
                                        )}

                                        <div className="wt-actions">
                                            {!session.progressCompleted && (
                                                <>
                                                    <button
                                                        className="wt-btn wt-btn-sm"
                                                        style={{ background: 'var(--power-500)', color: '#111', border: 'none' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            startSession(session)
                                                        }}
                                                    >
                                                        <Play style={{ width: 14, height: 14 }} />
                                                        {session.status === 'in_progress' ? 'Continue' : 'Start'} Workout
                                                    </button>
                                                    <button
                                                        className="wt-btn wt-btn-success wt-btn-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            completeSession(session.id)
                                                        }}
                                                    >
                                                        <CheckCircle style={{ width: 14, height: 14 }} />
                                                        Complete Workout
                                                    </button>
                                                </>
                                            )}
                                            {!isClient && (
                                                <button
                                                    className="wt-btn wt-btn-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setShowAddExercise(showAddExercise === session.id ? null : session.id)
                                                        setExerciseForm({ ...emptyExercise })
                                                    }}
                                                >
                                                    <Plus style={{ width: 14, height: 14 }} />
                                                    Add Exercise
                                                </button>
                                            )}
                                        </div>

                                        {showAddExercise === session.id && !isClient && (
                                            <div className="wt-exercise-form" style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
                                                <ExercisePicker onSelect={pickCatalogExercise} placeholder="Search catalog to add exercise..." />
                                                <div className="wt-exercise-form-row">
                                                    <input
                                                        placeholder="Exercise name"
                                                        value={exerciseForm.name}
                                                        onChange={e => handleNewExerciseChange('name', e.target.value)}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Sets"
                                                        value={exerciseForm.sets}
                                                        onChange={e => handleNewExerciseChange('sets', e.target.value)}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Reps"
                                                        value={exerciseForm.reps}
                                                        onChange={e => handleNewExerciseChange('reps', e.target.value)}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Weight"
                                                        value={exerciseForm.weight}
                                                        onChange={e => handleNewExerciseChange('weight', e.target.value)}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="wt-exercise-form-footer">
                                                    <input
                                                        placeholder="Notes (optional)"
                                                        value={exerciseForm.notes}
                                                        onChange={e => handleNewExerciseChange('notes', e.target.value)}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    <button
                                                        className="wt-btn wt-btn-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleAddExercise(session.id)
                                                        }}
                                                    >
                                                        Add
                                                    </button>
                                                    <button
                                                        className="wt-btn wt-btn-outline wt-btn-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setShowAddExercise(null)
                                                        }}
                                                    >
                                                        <X style={{ width: 14, height: 14 }} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {showNewForm && (
                <div className="wt-form-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowNewForm(false) }}>                    <div className="wt-form-card">
                        <div className="wt-form-header">
                            <h2>Log New Workout</h2>
                            <button className="wt-form-close" onClick={() => setShowNewForm(false)}>
                                <X />
                            </button>
                        </div>

                        <div className="wt-form-group">
                            <label>Title</label>
                            <input
                                placeholder="e.g. Upper Body Push"
                                value={newSession.title}
                                onChange={e => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </div>

                        <div className="wt-form-group">
                            <label>Date</label>
                            <input
                                type="date"
                                value={newSession.date}
                                onChange={e => setNewSession(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>

                        <div className="wt-form-group">
                            <label>Type</label>
                            <select
                                value={newSession.type}
                                onChange={e => setNewSession(prev => ({ ...prev, type: e.target.value }))}
                            >
                                <option value="strength">Strength</option>
                                <option value="hypertrophy">Hypertrophy</option>
                                <option value="cardio">Cardio</option>
                                <option value="hiit">HIIT</option>
                                <option value="flexibility">Flexibility</option>
                            </select>
                        </div>

                        <div className="wt-form-group">
                            <label>Description</label>
                            <textarea
                                placeholder="Optional notes about this session"
                                value={newSession.description}
                                onChange={e => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        <div className="wt-form-group">
                            <label>Exercises</label>
                            {newExercises.map((ex, i) => (
                                <div key={i} className="wt-exercise-entry">
                                    <Dumbbell />
                                    <span>{ex.name} — {ex.sets}×{ex.reps} @ {ex.weight}{ex.notes ? ` (${ex.notes})` : ''}</span>
                                    <button onClick={() => removeExerciseFromList(i)}>
                                        <X style={{ width: 12, height: 12 }} />
                                    </button>
                                </div>
                            ))}
                            {!isClient && (
                                <>
                                    <div className="wt-exercise-form-row" style={{ marginTop: 8 }}>
                                        <input
                                            placeholder="Name"
                                            value={exerciseForm.name}
                                            onChange={e => handleNewExerciseChange('name', e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Sets"
                                            value={exerciseForm.sets}
                                            onChange={e => setExerciseForm(prev => ({ ...prev, sets: e.target.value }))}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Reps"
                                            value={exerciseForm.reps}
                                            onChange={e => setExerciseForm(prev => ({ ...prev, reps: e.target.value }))}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Weight"
                                            value={exerciseForm.weight}
                                            onChange={e => setExerciseForm(prev => ({ ...prev, weight: e.target.value }))}
                                        />
                                    </div>
                                    <div className="wt-form-picker-hint">
                                        <ExercisePicker onSelect={pickCatalogExercise} placeholder="…or search the catalog to fill the name" />
                                    </div>
                                    <div className="wt-exercise-form-footer">
                                        <input
                                            placeholder="Notes (optional)"
                                            value={exerciseForm.notes}
                                            onChange={e => setExerciseForm(prev => ({ ...prev, notes: e.target.value }))}
                                        />
                                        <button className="wt-btn wt-btn-sm" onClick={addExerciseToList}>
                                            Add to list
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            className="wt-btn"
                            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                            onClick={handleCreateSession}
                        >
                            Create Session
                        </button>
                    </div>
                </div>
            )}

            {activeSession && (
                <GuidedWorkout
                    session={activeSession}
                    onClose={() => {
                        setActiveSession(null)
                        loadSessions()
                    }}
                    onFinished={() => loadSessions()}
                />
            )}
        </div>
    )
}
