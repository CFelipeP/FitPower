import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Calendar, Filter, Smile, Moon, Sun, Activity } from 'lucide-react'
import './ClientCheckins.css'

const MOOD_MAP = {
  great: { emoji: '\u{1F60A}', color: '#22c55e', label: 'Great' },
  good: { emoji: '\u{1F642}', color: '#3b82f6', label: 'Good' },
  okay: { emoji: '\u{1F610}', color: '#f59e0b', label: 'Okay' },
  bad: { emoji: '\u{1F61F}', color: '#f97316', label: 'Bad' },
  terrible: { emoji: '\u{1F622}', color: '#ef4444', label: 'Terrible' },
}

export default function ClientCheckins({ clientId }) {
  const { showToast } = useToast()
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const loadCheckins = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      let url = `/coach/clients/${clientId}/checkins`
      const params = []
      if (dateFrom) params.push(`from=${dateFrom}`)
      if (dateTo) params.push(`to=${dateTo}`)
      if (params.length) url += '?' + params.join('&')
      const data = await apiFetch(url)
      setCheckins(Array.isArray(data) ? data : [])
    } catch {
      showToast('Error loading check-ins')
    } finally {
      setLoading(false)
    }
  }, [clientId, dateFrom, dateTo, showToast])

  useEffect(() => { loadCheckins() }, [loadCheckins])

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function getMoodInfo(mood) {
    return MOOD_MAP[mood?.toLowerCase()] || { emoji: '\u{1F914}', color: '#888', label: mood || 'Unknown' }
  }

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="cc-container">
      <div className="cc-header">
        <h2 className="cc-title">
          <Activity size={22} /> Client Check-ins
        </h2>
        <button className="cc-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
          <Filter size={16} /> {showFilters ? 'Hide Filters' : 'Filter'}
        </button>
      </div>

      {showFilters && (
        <div className="cc-filters">
          <div className="cc-filter-group">
            <label>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="cc-input" />
          </div>
          <div className="cc-filter-group">
            <label>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="cc-input" />
          </div>
          <button className="cc-clear-btn" onClick={clearFilters}>Clear</button>
        </div>
      )}

      {loading ? (
        <div className="cc-loading">Loading check-ins...</div>
      ) : checkins.length === 0 ? (
        <div className="cc-empty">
          <Activity size={48} />
          <p>No check-ins found</p>
        </div>
      ) : (
        <div className="cc-list">
          {checkins.map((c) => {
            const mood = getMoodInfo(c.mood)
            return (
              <div key={c.id} className="cc-card">
                <div className="cc-card-top">
                  <div className="cc-date">
                    <Calendar size={14} />
                    <span>{formatDate(c.date || c.createdAt)}</span>
                  </div>
                  {c.dayLabel && <span className="cc-day-label">{c.dayLabel}</span>}
                </div>
                <div className="cc-card-body">
                  <div className="cc-mood-section">
                    <span className="cc-mood-emoji" style={{ background: `${mood.color}1A` }}>
                      {mood.emoji}
                    </span>
                    <span className="cc-mood-label" style={{ color: mood.color }}>{mood.label}</span>
                  </div>
                  <div className="cc-metrics">
                    <div className="cc-metric">
                      <Moon size={14} />
                      <span className="cc-metric-value">{c.sleepHours ?? '-'}h</span>
                      <span className="cc-metric-label">Sleep</span>
                    </div>
                    <div className="cc-metric">
                      <Sun size={14} />
                      <span className="cc-metric-value">{c.energyLevel ?? '-'}/10</span>
                      <span className="cc-metric-label">Energy</span>
                    </div>
                  </div>
                </div>
                {c.notes && (
                  <div className="cc-notes">
                    <Smile size={14} />
                    <p>{c.notes}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
