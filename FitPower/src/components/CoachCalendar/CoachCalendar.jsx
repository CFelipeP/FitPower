import { useState, useEffect, useMemo } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import {
    CalendarDays, Plus, X, Clock, Users, Edit2, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react'
import './CoachCalendar.css'

function getWeekDays(startDate) {
    const d = new Date(startDate)
    d.setHours(0, 0, 0, 0)
    const days = []
    for (let i = 0; i < 7; i++) {
        const day = new Date(d)
        day.setDate(d.getDate() + i)
        days.push(day)
    }
    return days
}

function getMonday(date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
}

function formatISODate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function formatDisplayDate(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isToday(date) {
    const t = new Date()
    return date.getFullYear() === t.getFullYear() &&
        date.getMonth() === t.getMonth() &&
        date.getDate() === t.getDate()
}

function isPastDate(date) {
    const t = new Date()
    t.setHours(23, 59, 59, 999)
    return date.getTime() < t.getTime() && !isToday(date)
}

const emptyForm = {
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'group',
    description: '',
    programId: ''
}

export default function CoachCalendar() {
    const { showToast } = useToast()
    const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()))
    const [sessions, setSessions] = useState([])
    const [programs, setPrograms] = useState([])
    const [selectedDate, setSelectedDate] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [editingSession, setEditingSession] = useState(null)
    const [formData, setFormData] = useState({ ...emptyForm })
    const [loading, setLoading] = useState(true)

    const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart])

    useEffect(() => {
        Promise.all([
            apiFetch('/sessions'),
            apiFetch('/programs')
        ])
            .then(([sessionsData, programsData]) => {
                setSessions(sessionsData)
                setPrograms(programsData.programs || programsData)
            })
            .catch(() => showToast('Error loading calendar data'))
            .finally(() => setLoading(false))
    }, [showToast])

    function goPrevWeek() {
        const s = new Date(currentWeekStart)
        s.setDate(s.getDate() - 7)
        setCurrentWeekStart(s)
    }

    function goNextWeek() {
        const s = new Date(currentWeekStart)
        s.setDate(s.getDate() + 7)
        setCurrentWeekStart(s)
    }

    function goToday() {
        setCurrentWeekStart(getMonday(new Date()))
    }

    function sessionsForDate(date) {
        const ds = formatISODate(date)
        return sessions.filter(s => {
            const sd = s.date ? s.date.split('T')[0] : ''
            return sd === ds
        })
    }

    function handleDayClick(day) {
        setSelectedDate(day)
        setShowForm(false)
        setEditingSession(null)
        setFormData({ ...emptyForm, date: formatISODate(day) })
    }

    function openAddForm() {
        setShowForm(true)
        setEditingSession(null)
        const d = selectedDate || new Date()
        setFormData({ ...emptyForm, date: formatISODate(d) })
    }

    function handleEdit(session) {
        setEditingSession(session)
        setShowForm(true)
        setFormData({
            title: session.title || '',
            date: session.date ? session.date.split('T')[0] : '',
            startTime: session.startTime || '',
            endTime: session.endTime || '',
            type: session.type || 'group',
            description: session.description || '',
            programId: session.programId || session.programId === 0 ? session.programId : ''
        })
    }

    function handleDelete(session) {
        if (!confirm('Delete this session?')) return
        apiFetch(`/sessions/${session.id}`, { method: 'DELETE' })
            .then(() => {
                setSessions(prev => prev.filter(s => s.id !== session.id))
                showToast('Session deleted')
            })
            .catch(() => showToast('Error deleting session'))
    }

    function handleFormChange(e) {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    function handleFormSubmit(e) {
        e.preventDefault()
        const isEdit = !!editingSession
        const url = isEdit ? `/sessions/${editingSession.id}` : '/sessions'
        const method = isEdit ? 'PUT' : 'POST'

        apiFetch(url, {
            method,
            body: JSON.stringify({
                title: formData.title,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime || undefined,
                type: formData.type,
                description: formData.description || undefined,
                programId: formData.programId || undefined
            })
        })
            .then((data) => {
                if (isEdit) {
                    setSessions(prev => prev.map(s => s.id === editingSession.id ? { ...s, ...data } : s))
                } else {
                    setSessions(prev => [...prev, data])
                }
                setShowForm(false)
                setEditingSession(null)
                setFormData({ ...emptyForm })
                showToast(isEdit ? 'Session updated' : 'Session created')
            })
            .catch(() => showToast(isEdit ? 'Error updating session' : 'Error creating session'))
    }

    function closeForm() {
        setShowForm(false)
        setEditingSession(null)
        setFormData({ ...emptyForm })
    }

    const weekLabel = weekDays.length === 7
        ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : ''

    return (
        <div className="cc">
            <div className="cc-topbar">
                <div className="cc-topbar-left">
                    <CalendarDays className="cc-topbar-icon" />
                    <h2 className="cc-topbar-title">My Schedule</h2>
                </div>
                <div className="cc-topbar-right">
                    <button className="cc-btn cc-btn-ghost" onClick={goToday}>Today</button>
                    <div className="cc-nav-group">
                        <button className="cc-btn cc-btn-icon" onClick={goPrevWeek}><ChevronLeft /></button>
                        <button className="cc-btn cc-btn-icon" onClick={goNextWeek}><ChevronRight /></button>
                    </div>
                    <span className="cc-week-label">{weekLabel}</span>
                </div>
            </div>

            {loading ? (
                <div className="cc-loading">Loading schedule...</div>
            ) : (
                <>
                    <div className="cc-week-grid">
                        {weekDays.map((day, i) => {
                            const daySessions = sessionsForDate(day)
                            const today = isToday(day)
                            const past = isPastDate(day)
                            const sel = selectedDate && formatISODate(day) === formatISODate(selectedDate)
                            return (
                                <div
                                    key={i}
                                    className={`cc-cell${today ? ' cc-cell-today' : ''}${past ? ' cc-cell-past' : ''}${sel ? ' cc-cell-sel' : ''}`}
                                    onClick={() => handleDayClick(day)}
                                >
                                    <div className="cc-cell-hdr">
                                        <span className="cc-cell-day">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                        <span className="cc-cell-num">{day.getDate()}</span>
                                    </div>
                                    <div className="cc-cell-sessions">
                                        {daySessions.slice(0, 3).map(s => (
                                            <div key={s.id} className={`cc-cell-session${past || isPastDate(new Date(s.date)) ? ' cc-dim' : ''}`}>
                                                <span className="cc-dot" />
                                                <span className="cc-cell-sess-title">{s.title}</span>
                                            </div>
                                        ))}
                                        {daySessions.length > 3 && (
                                            <span className="cc-more">+{daySessions.length - 3} more</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {selectedDate && !showForm && (
                        <div className="cc-detail">
                            <div className="cc-detail-hdr">
                                <h3 className="cc-detail-title">{formatDisplayDate(selectedDate)}</h3>
                                <button className="cc-btn cc-btn-primary" onClick={openAddForm}>
                                    <Plus /> Add Session
                                </button>
                            </div>
                            <div className="cc-sessions">
                                {sessionsForDate(selectedDate).length === 0 ? (
                                    <p className="cc-empty">No sessions for this day.</p>
                                ) : (
                                    sessionsForDate(selectedDate).map(s => {
                                        const past = isPastDate(new Date(selectedDate))
                                        return (
                                            <div key={s.id} className={`cc-card${past ? ' cc-dim' : ''}`}>
                                                <div className="cc-card-body" onClick={() => handleEdit(s)}>
                                                    <div className="cc-card-top">
                                                        <h4 className="cc-card-title">{s.title}</h4>
                                                        <span className={`cc-badge cc-badge-${s.type === '1on1' ? 'oneone' : 'group'}`}>
                                                            {s.type === '1on1' ? '1-on-1' : 'Group'}
                                                        </span>
                                                    </div>
                                                    <div className="cc-card-info">
                                                        <Clock className="cc-info-icon" />
                                                        <span>{s.startTime}{s.endTime ? ` - ${s.endTime}` : ''}</span>
                                                        {s.programName && (
                                                            <>
                                                                <span className="cc-sep">·</span>
                                                                <Users className="cc-info-icon" />
                                                                <span>{s.programName}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {s.description && (
                                                        <p className="cc-card-desc">{s.description}</p>
                                                    )}
                                                    <span className={`cc-status cc-status-${(s.status || 'scheduled').toLowerCase()}`}>
                                                        {s.status || 'scheduled'}
                                                    </span>
                                                </div>
                                                <div className="cc-card-actions">
                                                    <button className="cc-btn cc-btn-sm" onClick={() => handleEdit(s)}><Edit2 /></button>
                                                    <button className="cc-btn cc-btn-sm cc-btn-danger" onClick={() => handleDelete(s)}><Trash2 /></button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {showForm && (
                        <div className="cc-overlay" onClick={closeForm}>
                            <div className="cc-modal" onClick={e => e.stopPropagation()}>
                                <div className="cc-modal-hdr">
                                    <h3>{editingSession ? 'Edit Session' : 'New Session'}</h3>
                                    <button className="cc-btn cc-btn-icon" onClick={closeForm}><X /></button>
                                </div>
                                <form className="cc-form" onSubmit={handleFormSubmit}>
                                    <div className="cc-fg">
                                        <label>Title</label>
                                        <input type="text" name="title" value={formData.title} onChange={handleFormChange} required placeholder="e.g. HIIT Morning Flow" />
                                    </div>
                                    <div className="cc-fr">
                                        <div className="cc-fg">
                                            <label>Date</label>
                                            <input type="date" name="date" value={formData.date} onChange={handleFormChange} required />
                                        </div>
                                        <div className="cc-fg">
                                            <label>Type</label>
                                            <select name="type" value={formData.type} onChange={handleFormChange}>
                                                <option value="group">Group</option>
                                                <option value="1on1">1-on-1</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="cc-fr">
                                        <div className="cc-fg">
                                            <label>Start Time</label>
                                            <input type="time" name="startTime" value={formData.startTime} onChange={handleFormChange} required />
                                        </div>
                                        <div className="cc-fg">
                                            <label>End Time</label>
                                            <input type="time" name="endTime" value={formData.endTime} onChange={handleFormChange} />
                                        </div>
                                    </div>
                                    <div className="cc-fg">
                                        <label>Program</label>
                                        <select name="programId" value={formData.programId} onChange={handleFormChange}>
                                            <option value="">No program</option>
                                            {programs.map(p => (
                                                <option key={p.id} value={p.id}>{p.name || p.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="cc-fg">
                                        <label>Description</label>
                                        <textarea name="description" value={formData.description} onChange={handleFormChange} rows={3} placeholder="Optional notes..." />
                                    </div>
                                    <div className="cc-modal-actions">
                                        <button type="button" className="cc-btn cc-btn-secondary" onClick={closeForm}>Cancel</button>
                                        <button type="submit" className="cc-btn cc-btn-primary">
                                            {editingSession ? 'Update' : 'Create'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
