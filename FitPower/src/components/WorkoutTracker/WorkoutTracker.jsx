import { useState, useEffect, useCallback, Fragment } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import {
    CheckCircle, Dumbbell, Clock, Flame, Plus, X, Trash2, ChevronDown, ClipboardList, Activity, Timer
} from 'lucide-react'
import RestTimer from '../RestTimer/RestTimer'
import './WorkoutTracker.css'

const emptyExercise = { name: '', sets: '', reps: '', weight: '', notes: '' }

export default function WorkoutTracker() {
    const { showToast } = useToast()
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    const [activeTab, setActiveTab] = useState('all')
    const [showNewForm, setShowNewForm] = useState(false)
    const [showAddExercise, setShowAddExercise] = useState(null)
    const [restTimerExercise, setRestTimerExercise] = useState(null)

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
        try {
            await apiFetch(`/sessions/${sessionId}/exercises/${exerciseId}`, {
                method: 'DELETE'
            })
            showToast('Exercise deleted')
            loadSessions()
        } catch {
            showToast('Error deleting exercise')
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
        setExerciseForm(prev => ({ ...prev, [field]: value }))
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
        if (activeTab === 'scheduled') return s.status === 'scheduled'
        if (activeTab === 'completed') return s.status === 'completed'
        return true
    })

    function toggleExpand(id) {
        setExpandedId(prev => prev === id ? null : id)
    }

    function getStatusLabel(status) {
        if (status === 'completed') return { label: 'Completed', cls: 'wt-status-completed' }
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

            {filteredSessions.length === 0 ? (
                <div className="wt-empty">
                    <ClipboardList />
                    <p>No sessions to show</p>
                </div>
            ) : (
                <div className="wt-session-list">
                    {filteredSessions.map(session => {
                        const statusInfo = getStatusLabel(session.status)
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
                                        {session.status === 'completed' ? <CheckCircle /> : <Clock />}
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
                                            {exercises.map(ex => (
                                                <Fragment key={ex.id}>
                                                <div className="wt-exercise-item">
                                                    <div>
                                                        <div className="wt-exercise-name">
                                                            <Dumbbell />
                                                            {ex.name}
                                                        </div>
                                                        <div className="wt-exercise-detail">
                                                            <span>{ex.sets} × {ex.reps} @ {ex.weight}</span>
                                                        </div>
                                                        {ex.notes && (
                                                            <div className="wt-exercise-notes">{ex.notes}</div>
                                                        )}
                                                    </div>
                                                    <div style={{display:'flex',gap:4,alignItems:'flex-start'}}>
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
                                                        <button
                                                            className="wt-btn wt-btn-danger wt-btn-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                deleteExercise(session.id, ex.id)
                                                            }}
                                                        >
                                                            <Trash2 style={{ width: 12, height: 12 }} />
                                                        </button>
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
                                            {session.status !== 'completed' && (
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
                                            )}
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
                                        </div>

                                        {showAddExercise === session.id && (
                                            <div className="wt-exercise-form" style={{ marginTop: 12 }}>
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
                <div className="wt-form-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowNewForm(false) }}>
                    <div className="wt-form-card">
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
                            <div className="wt-exercise-form-row" style={{ marginTop: 8 }}>
                                <input
                                    placeholder="Name"
                                    value={exerciseForm.name}
                                    onChange={e => setExerciseForm(prev => ({ ...prev, name: e.target.value }))}
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
        </div>
    )
}
