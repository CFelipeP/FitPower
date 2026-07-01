import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Scale, Activity, Plus, X } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import './ProgressCharts.css'

const METRICS = [
  { key: 'weight', label: 'Weight', unit: 'kg', icon: Scale },
  { key: 'bodyFat', label: 'Body Fat', unit: '%', icon: Activity },
  { key: 'muscle', label: 'Muscle Mass', unit: 'kg', icon: TrendingUp },
  { key: 'bmi', label: 'BMI', unit: '', icon: Activity },
]

const CHART_KEYS = ['weight', 'bodyFat', 'muscle', 'bmi']

export default function ProgressCharts() {
  const { showToast } = useToast()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartMetric, setChartMetric] = useState('weight')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ weight: '', bodyFat: '', muscle: '', bmi: '', date: '' })

  const loadData = useCallback(async () => {
    try {
      const result = await apiFetch('/metrics')
      setData(Array.isArray(result) ? result : [])
    } catch {
      showToast('Error loading metrics')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadData() }, [loadData])

  function latest(key) {
    if (!data.length) return '—'
    const val = data[data.length - 1][key]
    return val != null ? val : '—'
  }

  function change(key) {
    if (data.length < 2) return null
    const curr = data[data.length - 1][key]
    const prev = data[data.length - 2][key]
    if (curr == null || prev == null) return null
    return +(curr - prev).toFixed(2)
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await apiFetch('/metrics', {
        method: 'POST',
        body: JSON.stringify({
          weight: parseFloat(form.weight),
          bodyFat: parseFloat(form.bodyFat),
          muscle: parseFloat(form.muscle),
          bmi: parseFloat(form.bmi),
          date: form.date || new Date().toISOString().split('T')[0],
        }),
      })
      showToast('Measurement saved!')
      setModalOpen(false)
      setForm({ weight: '', bodyFat: '', muscle: '', bmi: '', date: '' })
      loadData()
    } catch {
      showToast('Error saving measurement')
    }
  }

  // SVG chart
  const chartData = data.filter(d => d[chartMetric] != null)
  const values = chartData.map(d => d[chartMetric])
  const minVal = values.length ? Math.floor(Math.min(...values) * 0.95) : 0
  const maxVal = values.length ? Math.ceil(Math.max(...values) * 1.05) : 100
  const pad = { top: 30, right: 30, bottom: 40, left: 55 }
  const svgW = 600
  const svgH = 300
  const chartW = svgW - pad.left - pad.right
  const chartH = svgH - pad.top - pad.bottom
  const valRange = maxVal - minVal || 1

  function xPos(i) {
    const len = Math.max(chartData.length - 1, 1)
    return pad.left + (i / len) * chartW
  }

  function yPos(val) {
    return pad.top + chartH - ((val - minVal) / valRange) * chartH
  }

  const points = chartData.map((d, i) => `${xPos(i)},${yPos(d[chartMetric])}`).join(' ')

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (valRange * i) / 4
    return { y: yPos(val), label: val.toFixed(1) }
  })

  return (
    <div className="pc-container">
      {/* Chart */}
      <div className="pc-card pc-chart-card">
        <div className="pc-chart-header">
          <h3 className="pc-chart-title">Progress Chart</h3>
          <div className="pc-chart-toggles">
            {CHART_KEYS.map(key => (
              <button
                key={key}
                className={'pc-toggle' + (chartMetric === key ? ' pc-active' : '')}
                onClick={() => setChartMetric(key)}
              >
                {key === 'weight' ? 'Weight' : key === 'bodyFat' ? 'Body Fat' : key === 'muscle' ? 'Muscle' : 'BMI'}
              </button>
            ))}
          </div>
        </div>
        <div className="pc-chart-wrap">
          {chartData.length < 2 ? (
            <div className="pc-empty-chart">{loading ? 'Loading...' : 'Not enough data points to show chart'}</div>
          ) : (
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="pc-svg" preserveAspectRatio="xMidYMid meet">
              {gridLines.map((g, i) => (
                <g key={i}>
                  <line x1={pad.left} y1={g.y} x2={svgW - pad.right} y2={g.y} className="pc-grid-line" />
                  <text x={pad.left - 8} y={g.y + 4} className="pc-axis-label pc-y-label">{g.label}</text>
                </g>
              ))}
              {chartData.map((d, i) => {
                const total = chartData.length
                const show = total <= 10 || i % Math.max(1, Math.floor(total / 6)) === 0 || i === total - 1
                if (!show) return null
                const label = d.date ? d.date.slice(5) : ''
                return (
                  <text key={i} x={xPos(i)} y={svgH - pad.bottom + 20} className="pc-axis-label pc-x-label">
                    {label}
                  </text>
                )
              })}
              <polyline points={points} className="pc-line" />
              {chartData.map((d, i) => (
                <circle key={i} cx={xPos(i)} cy={yPos(d[chartMetric])} r="4" className="pc-dot" />
              ))}
            </svg>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="pc-metrics-grid">
        {METRICS.map(m => {
          const diff = change(m.key)
          const val = latest(m.key)
          const Icon = m.icon
          return (
            <div key={m.key} className="pc-card pc-metric-card">
              <div className="pc-metric-header">
                <Icon className="pc-metric-icon" />
                <span className="pc-metric-label">{m.label}</span>
              </div>
              <div className="pc-metric-value">
                {val}{m.unit && <span className="pc-metric-unit"> {m.unit}</span>}
              </div>
              <div className={'pc-metric-change' + (diff != null && diff > 0 ? ' pc-up' : diff != null && diff < 0 ? ' pc-down' : '')}>
                {diff != null ? (
                  <>
                    <TrendingUp className={'pc-change-icon' + (diff > 0 ? ' pc-up-icon' : ' pc-down-icon')} />
                    <span>{diff > 0 ? '+' : ''}{diff.toFixed(1)}</span>
                  </>
                ) : (
                  <span className="pc-no-data">—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Log Button */}
      <button className="pc-log-btn" onClick={() => setModalOpen(true)}>
        <Plus className="pc-log-icon" /> Log New Measurement
      </button>

      {/* Modal */}
      {modalOpen && (
        <div className="pc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="pc-modal">
            <div className="pc-modal-header">
              <h3 className="pc-modal-title">New Measurement</h3>
              <button className="pc-modal-close" onClick={() => setModalOpen(false)}><X /></button>
            </div>
            <form className="pc-form" onSubmit={handleSubmit}>
              <label className="pc-field">
                <span>Weight (kg)</span>
                <input name="weight" type="number" step="0.1" value={form.weight} onChange={handleChange} required />
              </label>
              <label className="pc-field">
                <span>Body Fat (%)</span>
                <input name="bodyFat" type="number" step="0.1" value={form.bodyFat} onChange={handleChange} required />
              </label>
              <label className="pc-field">
                <span>Muscle Mass (kg)</span>
                <input name="muscle" type="number" step="0.1" value={form.muscle} onChange={handleChange} required />
              </label>
              <label className="pc-field">
                <span>BMI</span>
                <input name="bmi" type="number" step="0.1" value={form.bmi} onChange={handleChange} required />
              </label>
              <label className="pc-field">
                <span>Date</span>
                <input name="date" type="date" value={form.date} onChange={handleChange} />
              </label>
              <button type="submit" className="pc-submit-btn">Save Measurement</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
