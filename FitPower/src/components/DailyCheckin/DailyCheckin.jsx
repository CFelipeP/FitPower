import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Sun, Moon, Cloud, Activity, Calendar, Smile } from 'lucide-react'
import './DailyCheckin.css'

const MOODS = [
    { value: 'great', emoji: '\u{1F60A}', label: 'Great', color: '#22c55e' },
    { value: 'good', emoji: '\u{1F642}', label: 'Good', color: '#3b82f6' },
    { value: 'okay', emoji: '\u{1F610}', label: 'Okay', color: '#f59e0b' },
    { value: 'bad', emoji: '\u{1F61F}', label: 'Bad', color: '#f97316' },
    { value: 'terrible', emoji: '\u{1F622}', label: 'Terrible', color: '#ef4444' },
]

function formatDate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function getDayLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.round((today - d) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return d.toLocaleDateString('en-US', { weekday: 'short' })
}

export default function DailyCheckin() {
    const { showToast } = useToast()
    const [mood, setMood] = useState(null)
    const [sleepHours, setSleepHours] = useState(7)
    const [energyLevel, setEnergyLevel] = useState(5)
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [history, setHistory] = useState([])
    const [todayCheckin, setTodayCheckin] = useState(null)
    const [loaded, setLoaded] = useState(false)
    const [dirty, setDirty] = useState(false)
    const [checkedIn, setCheckedIn] = useState(false)

    const handleSave = useCallback(async () => {
        if (saving || checkedIn) return
        setSaving(true)
        try {
            const payload = {
                date: formatDate(new Date()),
                mood,
                sleepHours,
                energyLevel,
                notes,
            }
            const result = await apiFetch('/checkins', {
                method: 'POST',
                body: JSON.stringify(payload),
            })
            setTodayCheckin(result)
            setCheckedIn(true)
            setDirty(false)
            showToast('Check-in saved!')
        } catch (e) {
            showToast(e.message || 'Failed to save check-in')
        } finally {
            setSaving(false)
        }
    }, [mood, sleepHours, energyLevel, notes, saving, checkedIn, showToast])

    useEffect(() => {
        const today = formatDate(new Date())
        Promise.all([
            apiFetch(`/checkins?date=${today}`),
            apiFetch('/checkins/history?days=7'),
        ]).then(([checkin, hist]) => {
            if (checkin) {
                setTodayCheckin(checkin)
                setCheckedIn(true)
                setMood(checkin.mood)
                setSleepHours(checkin.sleepHours)
                setEnergyLevel(checkin.energyLevel)
                setNotes(checkin.notes || '')
            }
            setHistory(hist || [])
            setLoaded(true)
        }).catch(() => {
            setLoaded(true)
        })
    }, [])

    useEffect(() => {
        if (loaded && dirty && !checkedIn) {
            const timer = setTimeout(() => handleSave(), 1500)
            return () => clearTimeout(timer)
        }
    }, [mood, sleepHours, energyLevel, notes, dirty, checkedIn, handleSave, loaded])

    function handleChange(setter) {
        return (val) => {
            setter(val)
            if (loaded && !checkedIn) setDirty(true)
        }
    }

    const moodColors = {
        great: '#22c55e',
        good: '#3b82f6',
        okay: '#f59e0b',
        bad: '#f97316',
        terrible: '#ef4444',
    }

    return (
        <div className="dc-container">
            <div className="dc-header">
                <h2 className="dc-title">
                    <Activity size={22} />
                    Daily Check-in
                </h2>
                {todayCheckin && (
                    <span className="dc-checked-badge">
                        <Smile size={14} />
                        Checked in
                    </span>
                )}
            </div>

            <section className="dc-section">
                <div className="dc-section-heading">
                    <Smile size={18} />
                    <span>Mood</span>
                </div>
                <div className="dc-mood-grid">
                    {MOODS.map((m) => (
                        <button
                            key={m.value}
                            className={`dc-mood-btn ${mood === m.value ? 'dc-mood-active' : ''}`}
                            style={{
                                borderColor: mood === m.value ? m.color : 'transparent',
                                background: mood === m.value ? `${m.color}1A` : 'transparent',
                            }}
                            onClick={() => handleChange(setMood)(m.value)}
                            title={m.label}
                        >
                            <span className="dc-mood-emoji">{m.emoji}</span>
                            <span className="dc-mood-label">{m.label}</span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="dc-section">
                <div className="dc-section-heading">
                    <Moon size={18} />
                    <span>Sleep</span>
                    <span className="dc-value-badge">{sleepHours}h</span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={12}
                    step={0.5}
                    value={sleepHours}
                    onChange={(e) => handleChange(setSleepHours)(Number(e.target.value))}
                    className="dc-slider"
                />
                <div className="dc-slider-labels">
                    <span>0h</span>
                    <span>12h</span>
                </div>
            </section>

            <section className="dc-section">
                <div className="dc-section-heading">
                    <Sun size={18} />
                    <span>Energy</span>
                    <span className="dc-value-badge">{energyLevel}/10</span>
                </div>
                <div className="dc-energy-grid">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <button
                            key={n}
                            className={`dc-energy-btn ${energyLevel >= n ? 'dc-energy-active' : ''}`}
                            onClick={() => handleChange(setEnergyLevel)(n)}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </section>

            <section className="dc-section">
                <div className="dc-section-heading">
                    <Cloud size={18} />
                    <span>Notes</span>
                </div>
                <textarea
                    className="dc-textarea"
                    rows={3}
                    placeholder="How are you feeling today?..."
                    value={notes}
                    onChange={(e) => handleChange(setNotes)(e.target.value)}
                />
            </section>

            <button
                className={`dc-save-btn ${checkedIn ? 'dc-saved' : ''}`}
                onClick={handleSave}
                disabled={saving || !loaded || checkedIn}
            >
                {saving ? 'Saving...' : checkedIn ? '✓ Checked In Today' : 'Save Check-in'}
            </button>

            {history.length > 0 && (
                <section className="dc-section dc-history-section">
                    <div className="dc-section-heading">
                        <Calendar size={18} />
                        <span>Last 7 Days</span>
                    </div>
                    <div className="dc-history-list">
                        {history.map((h) => (
                            <div key={h.date} className="dc-history-row">
                                <span className="dc-history-day">{getDayLabel(h.date)}</span>
                                <div className="dc-history-bar-track">
                                    <div
                                        className="dc-history-bar"
                                        style={{
                                            width: `${(h.energyLevel || 5) * 10}%`,
                                            backgroundColor: moodColors[h.mood] || '#555',
                                        }}
                                    />
                                </div>
                                <span className="dc-history-emoji">
                                    {MOODS.find((m) => m.value === h.mood)?.emoji || ''}
                                </span>
                                <span className="dc-history-sleep">{h.sleepHours}h</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
