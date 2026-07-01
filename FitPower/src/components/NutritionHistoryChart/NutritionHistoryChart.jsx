import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import './NutritionHistoryChart.css'

export default function NutritionHistoryChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(14)
  const [avgCalories, setAvgCalories] = useState(0)
  const [avgTarget, setAvgTarget] = useState(0)
  const [trend, setTrend] = useState('stable')
  const [bestDay, setBestDay] = useState(null)

  useEffect(() => {
    setLoading(true)
    apiFetch(`/nutrition/history?days=${days}`)
      .then((rows) => {
        const arr = Array.isArray(rows) ? rows : []
        setData(arr)

        if (arr.length > 0) {
          const totalCal = arr.reduce((s, r) => s + (r.caloriesConsumed || 0), 0)
          const totalTgt = arr.reduce((s, r) => s + (r.caloriesTarget || 0), 0)
          const avgC = Math.round(totalCal / arr.length)
          const avgT = Math.round(totalTgt / arr.length)
          setAvgCalories(avgC)
          setAvgTarget(avgT)

          const diff = avgC - avgT
          if (diff > 100) setTrend('up')
          else if (diff < -100) setTrend('down')
          else setTrend('stable')

          let best = { date: '', val: 0 }
          for (const r of arr) {
            const pct = r.caloriesTarget > 0 ? (r.caloriesConsumed || 0) / r.caloriesTarget : 0
            const score = 100 - Math.abs(1 - pct) * 100
            if (score > best.val) {
              best = { date: r.date, val: Math.round(score) }
            }
          }
          setBestDay(best)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days])

  const maxVal = Math.max(...data.map(r => Math.max(r.caloriesConsumed || 0, r.caloriesTarget || 0)), 1)
  const maxBar = Math.max(...data.map(r => r.caloriesConsumed || 0), 1)

  function formatDate(d) {
    const date = new Date(d + 'T12:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="nhc-container">
      <div className="nhc-header">
        <h3 className="nhc-title">
          <BarChart3 size={18} /> Calories Trend
        </h3>
        <select className="nhc-select" value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>

      {loading ? (
        <div className="nhc-loading">Loading...</div>
      ) : data.length === 0 ? (
        <div className="nhc-empty">
          <BarChart3 size={32} />
          <p>No nutrition data yet. Start logging your meals!</p>
        </div>
      ) : (
        <>
          <div className="nhc-stats">
            <div className="nhc-stat">
              <span className="nhc-stat-val">{avgCalories}</span>
              <span className="nhc-stat-label">Avg calories</span>
            </div>
            <div className="nhc-stat">
              <span className="nhc-stat-val">{avgTarget}</span>
              <span className="nhc-stat-label">Avg target</span>
            </div>
            <div className="nhc-stat">
              <span className={'nhc-stat-val nhc-trend-' + trend}>
                {trend === 'up' ? <TrendingUp size={16} /> : trend === 'down' ? <TrendingDown size={16} /> : <Minus size={16} />}
              </span>
              <span className="nhc-stat-label">{trend === 'up' ? 'Over' : trend === 'down' ? 'Under' : 'On target'}</span>
            </div>
            {bestDay && (
              <div className="nhc-stat">
                <span className="nhc-stat-val">{bestDay.val}%</span>
                <span className="nhc-stat-label">Best day</span>
              </div>
            )}
          </div>

          <div className="nhc-chart">
            <div className="nhc-y-axis">
              <span>{maxVal}</span>
              <span>{Math.round(maxVal / 2)}</span>
              <span>0</span>
            </div>
            <div className="nhc-bars-wrap">
              {data.map((r, i) => {
                const consumedH = maxBar > 0 ? ((r.caloriesConsumed || 0) / maxBar) * 100 : 0
                const targetH = maxBar > 0 ? ((r.caloriesTarget || 0) / maxBar) * 100 : 0
                const isOverTarget = r.caloriesConsumed > r.caloriesTarget
                return (
                  <div key={r.date || i} className="nhc-bar-col" title={`${formatDate(r.date)}: ${r.caloriesConsumed || 0} / ${r.caloriesTarget || 0} kcal`}>
                    <div className="nhc-bars">
                      <div className="nhc-bar-consumed" style={{ height: `${consumedH}%` }} data-over={isOverTarget ? 'true' : 'false'} />
                      <div className="nhc-bar-target" style={{ height: `${targetH}%` }} />
                    </div>
                    {data.length <= 14 && <span className="nhc-bar-label">{formatDate(r.date)}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="nhc-legend">
            <span><span className="nhc-dot nhc-dot-consumed" /> Consumed</span>
            <span><span className="nhc-dot nhc-dot-target" /> Target</span>
          </div>
        </>
      )}
    </div>
  )
}
