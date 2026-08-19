import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { swalError } from '../../lib/alerts'
import { useToast } from '../../context/ToastContext'
import { CalendarClock, Plus, Trash2, Loader2 } from 'lucide-react'
import './CoachAvailability.css'

const DAYS = [
    { label: 'Monday', short: 'Mon' },
    { label: 'Tuesday', short: 'Tue' },
    { label: 'Wednesday', short: 'Wed' },
    { label: 'Thursday', short: 'Thu' },
    { label: 'Friday', short: 'Fri' },
    { label: 'Saturday', short: 'Sat' },
    { label: 'Sunday', short: 'Sun' },
]

export default function CoachAvailability() {
    const { showToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [draft, setDraft] = useState([])

    const load = () => {
        setLoading(true)
        apiFetch('/coach/availability')
            .then(d => setDraft(Array.isArray(d) ? d : []))
            .catch(() => swalError('Error loading availability'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const addSlot = () => {
        setDraft(prev => [...prev, { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }])
    }

    const updateSlot = (idx, field, value) => {
        setDraft(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)))
    }

    const removeSlot = (idx) => {
        setDraft(prev => prev.filter((_, i) => i !== idx))
    }

    const save = async () => {
        const clean = draft
            .filter(s => s.startTime && s.endTime && s.startTime < s.endTime)
            .map(s => ({ dayOfWeek: Number(s.dayOfWeek), startTime: s.startTime, endTime: s.endTime }))
        setSaving(true)
        try {
            await apiFetch('/coach/availability', {
                method: 'PUT',
                body: JSON.stringify({ slots: clean }),
            })
            showToast('Availability saved. Clients can now book these slots.')
        } catch (e) {
            swalError(e.message || 'Could not save availability')
        } finally {
            setSaving(false)
        }
    }

    const grouped = DAYS.map((day, dayIdx) => ({
        ...day,
        dayIdx,
        slots: draft.filter(s => Number(s.dayOfWeek) === dayIdx),
    }))

    if (loading) {
        return <div className="cav-wrap"><div className="cav-loading"><Loader2 size={24} className="spin" /> Loading availability...</div></div>
    }

    return (
        <div className="cav-wrap">
            <div className="cav-header">
                <div>
                    <h1 className="cav-title"><CalendarClock size={22} /> My Availability</h1>
                    <p className="cav-subtitle">Set your recurring weekly hours. Clients book sessions inside these slots.</p>
                </div>
                <div className="cav-actions">
                    <button className="cav-btn cav-btn-secondary" onClick={addSlot}><Plus size={15} /> Add slot</button>
                    <button className="cav-btn cav-btn-primary" onClick={save} disabled={saving}>
                        {saving ? <Loader2 size={15} className="spin" /> : null} Save availability
                    </button>
                </div>
            </div>

            <div className="cav-grid">
                {grouped.map(day => (
                    <div key={day.dayIdx} className={`cav-day ${day.slots.length ? 'cav-day-has' : ''}`}>
                        <div className="cav-day-head">
                            <span className="cav-day-name">{day.label}</span>
                            {day.slots.length > 0 && <span className="cav-day-count">{day.slots.length} slot{day.slots.length > 1 ? 's' : ''}</span>}
                        </div>
                        {day.slots.length === 0 ? (
                            <p className="cav-day-empty">Not available</p>
                        ) : (
                            day.slots.map((slot) => {
                                const idx = draft.indexOf(slot)
                                return (
                                    <div key={idx} className="cav-slot">
                                        <input type="time" className="cav-time" value={slot.startTime} onChange={e => updateSlot(idx, 'startTime', e.target.value)} />
                                        <span className="cav-dash">â€“</span>
                                        <input type="time" className="cav-time" value={slot.endTime} onChange={e => updateSlot(idx, 'endTime', e.target.value)} />
                                        <button className="cav-remove" onClick={() => removeSlot(idx)} title="Remove"><Trash2 size={13} /></button>
                                    </div>
                                )
                            })
                        )}
                    </div>
                ))}
            </div>

            <p className="cav-hint">Changes replace your previous schedule. Times are in your profile timezone.</p>
        </div>
    )
}
