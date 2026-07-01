import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Weight, TrendingUp } from 'lucide-react'
import './ClientMetrics.css'

export default function ClientMetrics({ clientId }) {
  const { showToast } = useToast()
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const chartRef = useRef(null)

  const loadMetrics = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const data = await apiFetch(`/coach/clients/${clientId}/metrics`)
      setMetrics(Array.isArray(data) ? data : [])
    } catch {
      showToast('Error loading metrics')
    } finally {
      setLoading(false)
    }
  }, [clientId, showToast])

  useEffect(() => { loadMetrics() }, [loadMetrics])

  const weightData = metrics.filter(m => m.weight != null).slice(-20)

  const chartWidth = 600
  const chartHeight = 240
  const padding = { top: 30, right: 30, bottom: 40, left: 60 }
  const plotW = chartWidth - padding.left - padding.right
  const plotH = chartHeight - padding.top - padding.bottom

  const minW = weightData.length ? Math.min(...weightData.map(d => d.weight)) * 0.98 : 0
  const maxW = weightData.length ? Math.max(...weightData.map(d => d.weight)) * 1.02 : 100
  const range = maxW - minW || 1

  const points = weightData.map((d, i) => {
    const x = padding.left + (i / Math.max(weightData.length - 1, 1)) * plotW
    const y = padding.top + plotH - ((d.weight - minW) / range) * plotH
    return `${x},${y}`
  }).join(' ')

  const yTicks = 5
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const val = minW + (range / (yTicks - 1)) * i
    return { y: padding.top + plotH - (i / (yTicks - 1)) * plotH, label: val.toFixed(1) }
  })

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const xLabels = weightData.filter((_, i) =>
    i === 0 || i === weightData.length - 1 || i % Math.max(1, Math.floor(weightData.length / 5)) === 0
  )

  const latest = metrics[metrics.length - 1]
  const latestWeight = latest?.weight
  const latestBf = latest?.bodyFat
  const latestMuscle = latest?.muscleKg
  const latestBmi = latest?.bmi

  return (
    <div className="cm-container">
      <div className="cm-header">
        <h2 className="cm-title">
          <Weight size={22} /> Body Metrics
        </h2>
      </div>

      {latest && (
        <div className="cm-summary-grid">
          {latestWeight != null && (
            <div className="cm-summary-card">
              <div className="cm-summary-value">{latestWeight}</div>
              <div className="cm-summary-label">Weight (kg)</div>
            </div>
          )}
          {latestBf != null && (
            <div className="cm-summary-card">
              <div className="cm-summary-value">{latestBf}%</div>
              <div className="cm-summary-label">Body Fat</div>
            </div>
          )}
          {latestMuscle != null && (
            <div className="cm-summary-card">
              <div className="cm-summary-value">{latestMuscle}</div>
              <div className="cm-summary-label">Muscle (kg)</div>
            </div>
          )}
          {latestBmi != null && (
            <div className="cm-summary-card">
              <div className="cm-summary-value">{latestBmi}</div>
              <div className="cm-summary-label">BMI</div>
            </div>
          )}
        </div>
      )}

      {weightData.length > 1 && (
        <div className="cm-chart-card">
          <div className="cm-chart-header">
            <TrendingUp size={18} />
            <span>Weight Trend</span>
          </div>
          <div className="cm-chart-wrap" ref={chartRef}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="cm-chart-svg">
              {yLabels.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={tick.y}
                    x2={chartWidth - padding.right}
                    y2={tick.y}
                    stroke="rgba(255,255,255,.06)"
                    strokeWidth="1"
                  />
                  <text x={padding.left - 8} y={tick.y + 4} textAnchor="end" fill="#737373" fontSize="11">
                    {tick.label}
                  </text>
                </g>
              ))}
              {xLabels.map((d, i) => {
                const idx = weightData.indexOf(d)
                const x = padding.left + (idx / Math.max(weightData.length - 1, 1)) * plotW
                return (
                  <text key={i} x={x} y={chartHeight - 12} textAnchor="middle" fill="#737373" fontSize="11">
                    {formatDate(d.date || d.createdAt)}
                  </text>
                )
              })}
              <polyline
                points={points}
                fill="none"
                stroke="#f97316"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {weightData.map((d, i) => {
                const x = padding.left + (i / Math.max(weightData.length - 1, 1)) * plotW
                const y = padding.top + plotH - ((d.weight - minW) / range) * plotH
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#f97316"
                    stroke="#13131a"
                    strokeWidth="2"
                  />
                )
              })}
            </svg>
          </div>
        </div>
      )}

      {loading ? (
        <div className="cm-loading">Loading metrics...</div>
      ) : metrics.length === 0 ? (
        <div className="cm-empty">
          <Weight size={48} />
          <p>No metrics recorded yet</p>
        </div>
      ) : (
        <div className="cm-table-wrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Weight</th>
                <th>Body Fat %</th>
                <th>Muscle kg</th>
                <th>BMI</th>
              </tr>
            </thead>
            <tbody>
              {[...metrics].reverse().map((m) => (
                <tr key={m.id}>
                  <td>{formatDate(m.date || m.createdAt)}</td>
                  <td className="cm-value-cell">{m.weight ?? '-'}</td>
                  <td className="cm-value-cell">{m.bodyFat != null ? `${m.bodyFat}%` : '-'}</td>
                  <td className="cm-value-cell">{m.muscleKg ?? '-'}</td>
                  <td className="cm-value-cell">{m.bmi ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
