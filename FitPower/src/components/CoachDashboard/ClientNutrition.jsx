import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Utensils, Calendar, BarChart3, ArrowLeft, ArrowRight } from 'lucide-react'
import './ClientNutrition.css'

export default function ClientNutrition({ clientId }) {
  const { showToast } = useToast()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('table')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const loadLogs = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const data = await apiFetch(`/coach/clients/${clientId}/nutrition`)
      setLogs(Array.isArray(data) ? data : [])
    } catch {
      showToast('Error loading nutrition data')
    } finally {
      setLoading(false)
    }
  }, [clientId, showToast])

  useEffect(() => { loadLogs() }, [loadLogs])

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const validLogs = logs.filter(l => l.calories != null)

  const avgCalories = validLogs.length
    ? Math.round(validLogs.reduce((s, l) => s + l.calories, 0) / validLogs.length)
    : 0

  const avgProtein = validLogs.length
    ? Math.round(validLogs.reduce((s, l) => s + (l.protein || 0), 0) / validLogs.length)
    : 0

  const avgCarbs = validLogs.length
    ? Math.round(validLogs.reduce((s, l) => s + (l.carbs || 0), 0) / validLogs.length)
    : 0

  const avgFat = validLogs.length
    ? Math.round(validLogs.reduce((s, l) => s + (l.fat || 0), 0) / validLogs.length)
    : 0

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay()
  }

  const logMap = {}
  logs.forEach(l => {
    if (l.date) {
      const key = l.date.slice(0, 10)
      logMap[key] = l
    }
  })

  const daysInMonth = getDaysInMonth(currentMonth.year, currentMonth.month)
  const firstDay = getFirstDayOfMonth(currentMonth.year, currentMonth.month)
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const prevMonth = () => {
    setCurrentMonth(p => {
      if (p.month === 0) return { year: p.year - 1, month: 11 }
      return { ...p, month: p.month - 1 }
    })
  }

  const nextMonth = () => {
    setCurrentMonth(p => {
      if (p.month === 11) return { year: p.year + 1, month: 0 }
      return { ...p, month: p.month + 1 }
    })
  }

  return (
    <div className="cn-container">
      <div className="cn-header">
        <h2 className="cn-title">
          <Utensils size={22} /> Client Nutrition
        </h2>
        <div className="cn-view-tabs">
          <button
            className={`cn-view-tab ${view === 'table' ? 'cn-active' : ''}`}
            onClick={() => setView('table')}
          >
            <BarChart3 size={14} /> Table
          </button>
          <button
            className={`cn-view-tab ${view === 'calendar' ? 'cn-active' : ''}`}
            onClick={() => setView('calendar')}
          >
            <Calendar size={14} /> Calendar
          </button>
        </div>
      </div>

      <div className="cn-summary-grid">
        <div className="cn-summary-card">
          <div className="cn-summary-value">{avgCalories}</div>
          <div className="cn-summary-label">Avg Calories</div>
        </div>
        <div className="cn-summary-card cn-protein">
          <div className="cn-summary-value">{avgProtein}g</div>
          <div className="cn-summary-label">Avg Protein</div>
        </div>
        <div className="cn-summary-card cn-carbs">
          <div className="cn-summary-value">{avgCarbs}g</div>
          <div className="cn-summary-label">Avg Carbs</div>
        </div>
        <div className="cn-summary-card cn-fat">
          <div className="cn-summary-value">{avgFat}g</div>
          <div className="cn-summary-label">Avg Fat</div>
        </div>
      </div>

      {loading ? (
        <div className="cn-loading">Loading nutrition data...</div>
      ) : logs.length === 0 ? (
        <div className="cn-empty">
          <Utensils size={48} />
          <p>No nutrition logs yet</p>
        </div>
      ) : view === 'table' ? (
        <div className="cn-table-wrap">
          <table className="cn-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Calories</th>
                <th>Protein</th>
                <th>Carbs</th>
                <th>Fat</th>
              </tr>
            </thead>
            <tbody>
              {[...logs].reverse().map((l) => (
                <tr key={l.id}>
                  <td>{formatDate(l.date)}</td>
                  <td className="cn-cell-highlight">{l.calories ?? '-'}</td>
                  <td>{l.protein != null ? `${l.protein}g` : '-'}</td>
                  <td>{l.carbs != null ? `${l.carbs}g` : '-'}</td>
                  <td>{l.fat != null ? `${l.fat}g` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cn-calendar">
          <div className="cn-cal-header">
            <button className="cn-cal-nav" onClick={prevMonth}><ArrowLeft size={16} /></button>
            <span className="cn-cal-title">{monthNames[currentMonth.month]} {currentMonth.year}</span>
            <button className="cn-cal-nav" onClick={nextMonth}><ArrowRight size={16} /></button>
          </div>
          <div className="cn-cal-grid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="cn-cal-day-header">{d}</div>
            ))}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="cn-cal-day cn-cal-empty" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const log = logMap[dateStr]
              const isToday = new Date().toISOString().slice(0, 10) === dateStr
              return (
                <div key={day} className={`cn-cal-day ${isToday ? 'cn-today' : ''} ${log ? 'cn-has-log' : ''}`}>
                  <span className="cn-cal-day-num">{day}</span>
                  {log && (
                    <div className="cn-cal-log-info">
                      <span className="cn-cal-cals">{log.calories || '-'}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
