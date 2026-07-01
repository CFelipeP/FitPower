import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Dumbbell, Plus, X } from 'lucide-react'
import './WorkoutLogs.css'

const emptyExercise = { exerciseId: '', sets: '', reps: '', weight: '', notes: '' }

export default function WorkoutLogs() {
    const { showToast } = useToast()
    const [logs, setLogs] = useState([])
    const [exercises, setExercises] = useState([])
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)

    const [logExercises, setLogExercises] = useState([{ ...emptyExercise }])
    const [sessionId, setSessionId] = useState('')

    const loadLogs = useCallback(async (p = 1) => {
        setLoading(true)
        try {
            const data = await apiFetch(`/workout-logs?page=${p}&perPage=20`)
            setLogs(data.logs || [])
            setTotal(data.total || 0)
            setPage(data.page || 1)
        } catch {
            showToast('Error loading workout logs')
        } finally {
            setLoading(false)
        }
    }, [showToast])

    useEffect(() => { loadLogs() }, [loadLogs])

    useEffect(() => {
        if (!showForm) return
        apiFetch('/exercises').then(setExercises).catch(() => {})
        apiFetch('/sessions').then(setSessions).catch(() => {})
    }, [showForm])

    const addExerciseRow = () => {
        setLogExercises(prev => [...prev, { ...emptyExercise }])
    }

    const removeExerciseRow = (index) => {
        setLogExercises(prev => prev.filter((_, i) => i !== index))
    }

    const updateExercise = (index, field, value) => {
        setLogExercises(prev => prev.map((ex, i) =>
            i === index ? { ...ex, [field]: value } : ex
        ))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const validExercises = logExercises.filter(ex => ex.exerciseId && ex.sets)
        if (!validExercises.length) {
            showToast('Add at least one exercise with sets')
            return
        }

        setSubmitting(true)
        try {
            const body = { exercises: validExercises.map(ex => ({
                exerciseId: parseInt(ex.exerciseId),
                sets: parseInt(ex.sets),
                reps: ex.reps || null,
                weight: ex.weight || null,
                notes: ex.notes || null,
            }))}
            if (sessionId) body.sessionId = parseInt(sessionId)

            await apiFetch('/workout-logs', { method: 'POST', body: JSON.stringify(body) })
            showToast('Workout logged!')
            setShowForm(false)
            setLogExercises([{ ...emptyExercise }])
            setSessionId('')
            loadLogs()
        } catch (e) {
            showToast(e.message || 'Error logging workout')
        } finally {
            setSubmitting(false)
        }
    }

    const perPage = 20
    const totalPages = Math.ceil(total / perPage)

    return (
        <div className="wl-workout-logs">
            <div className="wl-header">
                <h1 className="wl-title"><Dumbbell size={22} /> Workout Logs</h1>
                <button className="wl-btn wl-btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? 'Cancel' : 'Log Workout'}
                </button>
            </div>

            {showForm && (
                <form className="wl-form" onSubmit={handleSubmit}>
                    <div className="wl-form-group">
                        <label className="wl-label">Session (optional)</label>
                        <select className="wl-select" value={sessionId} onChange={e => setSessionId(e.target.value)}>
                            <option value="">No session</option>
                            {sessions.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="wl-exercises-section">
                        <div className="wl-exercises-header">
                            <span className="wl-label">Exercises</span>
                            <button type="button" className="wl-btn wl-btn-sm" onClick={addExerciseRow}>
                                <Plus size={14} /> Add Exercise
                            </button>
                        </div>

                        {logExercises.map((ex, i) => (
                            <div key={i} className="wl-exercise-row">
                                <div className="wl-exercise-row-top">
                                    <select
                                        className="wl-select wl-exercise-select"
                                        value={ex.exerciseId}
                                        onChange={e => updateExercise(i, 'exerciseId', e.target.value)}
                                        required
                                    >
                                        <option value="">Select exercise</option>
                                        {exercises.map(e => (
                                            <option key={e.id} value={e.id}>{e.name}</option>
                                        ))}
                                    </select>
                                    {logExercises.length > 1 && (
                                        <button type="button" className="wl-btn-icon" onClick={() => removeExerciseRow(i)}>
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="wl-exercise-inputs">
                                    <input
                                        type="number"
                                        className="wl-input"
                                        placeholder="Sets"
                                        value={ex.sets}
                                        onChange={e => updateExercise(i, 'sets', e.target.value)}
                                        min="1"
                                        required
                                    />
                                    <input
                                        type="text"
                                        className="wl-input"
                                        placeholder="Reps (e.g. 10,10,8)"
                                        value={ex.reps}
                                        onChange={e => updateExercise(i, 'reps', e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className="wl-input"
                                        placeholder="Weight (e.g. 135)"
                                        value={ex.weight}
                                        onChange={e => updateExercise(i, 'weight', e.target.value)}
                                    />
                                </div>
                                <input
                                    type="text"
                                    className="wl-input wl-notes"
                                    placeholder="Notes (optional)"
                                    value={ex.notes}
                                    onChange={e => updateExercise(i, 'notes', e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    <button type="submit" className="wl-btn wl-btn-primary wl-btn-full" disabled={submitting}>
                        {submitting ? 'Saving...' : 'Save Workout Log'}
                    </button>
                </form>
            )}

            {loading ? (
                <div className="wl-loading">Loading...</div>
            ) : logs.length === 0 ? (
                <div className="wl-empty">No workout logs yet. Start logging your workouts!</div>
            ) : (
                <>
                    <div className="wl-log-list">
                        {logs.map(log => (
                            <div key={log.id} className="wl-log-item">
                                <div className="wl-log-main">
                                    <div className="wl-log-exercise">{log.exerciseName || 'Unknown Exercise'}</div>
                                    <div className="wl-log-meta">
                                        {log.sets > 0 && <span className="wl-log-badge">{log.sets} sets</span>}
                                        {log.reps && <span className="wl-log-badge">{log.reps} reps</span>}
                                        {log.weight && <span className="wl-log-badge">{log.weight} lbs</span>}
                                    </div>
                                </div>
                                <div className="wl-log-right">
                                    <span className="wl-log-date">{log.loggedAt ? new Date(log.loggedAt).toLocaleDateString() : '-'}</span>
                                    {log.sessionTitle && <span className="wl-log-session">{log.sessionTitle}</span>}
                                </div>
                                {log.caloriesBurned != null && <div className="wl-log-calories">🔥 {log.caloriesBurned} kcal burned</div>}
                                {log.notes && <div className="wl-log-notes">{log.notes}</div>}
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="wl-pagination">
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i}
                                    className={`wl-btn wl-btn-sm ${page === i + 1 ? 'wl-btn-primary' : ''}`}
                                    onClick={() => loadLogs(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
