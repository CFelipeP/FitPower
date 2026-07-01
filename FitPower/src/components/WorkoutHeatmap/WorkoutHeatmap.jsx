import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Flame, ChevronLeft, ChevronRight } from 'lucide-react'
import './WorkoutHeatmap.css'

const COLOR_SCALE = [
  { min: 0, max: 0, color: '#1a1a24', label: 'No activity' },
  { min: 1, max: 3, color: '#0a2e1a', label: 'Low' },
  { min: 4, max: 7, color: '#14532d', label: 'Light' },
  { min: 8, max: 12, color: '#22c55e', label: 'Moderate' },
  { min: 13, max: Infinity, color: '#4ade80', label: 'High' },
]

function getColor(count) {
  if (count == null) return COLOR_SCALE[0].color
  for (const s of COLOR_SCALE) {
    if (count >= s.min && count <= s.max) return s.color
  }
  return COLOR_SCALE[COLOR_SCALE.length - 1].color
}

function getLabel(count) {
  if (count == null) return 'No activity'
  for (const s of COLOR_SCALE) {
    if (count >= s.min && count <= s.max) return s.label
  }
  return COLOR_SCALE[COLOR_SCALE.length - 1].label
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function WorkoutHeatmap() {
  const { showToast } = useToast()
  const [heatmap, setHeatmap] = useState({})
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [hoveredCell, setHoveredCell] = useState(null)

  const loadHeatmap = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/workout-logs/heatmap?year=${year}`)
      setHeatmap(data || {})
    } catch {
      showToast('Error loading heatmap')
    } finally {
      setLoading(false)
    }
  }, [year, showToast])

  useEffect(() => { loadHeatmap() }, [loadHeatmap])

  function buildWeeks() {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)
    const weeks = []
    let currentWeek = []
    const startDay = startDate.getDay()
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null)
    }
    const d = new Date(startDate)
    while (d <= endDate) {
      const dateStr = d.toISOString().slice(0, 10)
      const count = heatmap[dateStr]
      currentWeek.push({ date: dateStr, count: count || 0, day: d.getDay() })
      if (d.getDay() === 6) {
        weeks.push(currentWeek)
        currentWeek = []
      }
      d.setDate(d.getDate() + 1)
    }
    if (currentWeek.length) {
      while (currentWeek.length < 7) currentWeek.push(null)
      weeks.push(currentWeek)
    }
    return weeks
  }

  const weeks = buildWeeks()

  function getMonthBoundaries() {
    const boundaries = []
    for (let m = 0; m < 12; m++) {
      const firstDay = new Date(year, m, 1)
      const dayOfYear = Math.floor((firstDay - new Date(year, 0, 1)) / 86400000)
      const weekIndex = Math.floor((dayOfYear + new Date(year, 0, 1).getDay()) / 7)
      boundaries.push({ month: m, weekIndex })
    }
    return boundaries
  }

  const monthBoundaries = getMonthBoundaries()
  const monthPositions = monthBoundaries.map((mb, i) => {
    const w = weeks[mb.weekIndex]
    if (!w) return null
    const col = mb.weekIndex
    if (col < 0) return null
    return { label: MONTH_LABELS[i], col }
  }).filter(Boolean)

  const uniqueMonths = []
  const seen = new Set()
  monthPositions.forEach(mp => {
    if (mp && !seen.has(mp.label)) {
      seen.add(mp.label)
      uniqueMonths.push(mp)
    }
  })

  const currentYear = new Date().getFullYear()

  return (
    <div className="wh-container">
      <div className="wh-header">
        <h2 className="wh-title">
          <Flame size={22} /> Workout Heatmap
        </h2>
        <div className="wh-year-selector">
          <button className="wh-year-btn" onClick={() => setYear(y => y - 1)} disabled={year <= currentYear - 5}>
            <ChevronLeft size={16} />
          </button>
          <span className="wh-year-label">{year}</span>
          <button className="wh-year-btn" onClick={() => setYear(y => y + 1)} disabled={year >= currentYear}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="wh-loading">Loading heatmap...</div>
      ) : (
        <>
          <div className="wh-heatmap-wrap">
            <div className="wh-heatmap">
              <div className="wh-day-labels">
                {DAY_LABELS.map((d, i) => (
                  <span key={i} className="wh-day-label">{d}</span>
                ))}
              </div>
              <div className="wh-grid">
                <div className="wh-month-labels">
                  {uniqueMonths.map((mp, i) => (
                    <span
                      key={i}
                      className="wh-month-label"
                      style={{ gridColumn: mp.col + 1 }}
                    >
                      {mp.label}
                    </span>
                  ))}
                </div>
                <div className="wh-cells">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="wh-week">
                      {week.map((cell, ci) => (
                        <div
                          key={ci}
                          className={`wh-cell ${cell ? 'wh-has-data' : ''}`}
                          style={{ backgroundColor: cell ? getColor(cell.count) : 'transparent' }}
                          onMouseEnter={() => setHoveredCell(cell ? { ...cell, label: getLabel(cell.count) } : null)}
                          onMouseLeave={() => setHoveredCell(null)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="wh-tooltip">
            {hoveredCell ? (
              <><strong>{hoveredCell.date}</strong>: {hoveredCell.count} workouts ({hoveredCell.label})</>
            ) : (
              <span className="wh-tooltip-idle">Hover over a day to see details</span>
            )}
          </div>

          <div className="wh-legend">
            <span className="wh-legend-label">Less</span>
            {COLOR_SCALE.map((s, i) => (
              <div
                key={i}
                className="wh-legend-cell"
                style={{ backgroundColor: s.color }}
                title={s.label}
              />
            ))}
            <span className="wh-legend-label">More</span>
          </div>
        </>
      )}
    </div>
  )
}
