import { useState, useEffect, useMemo } from 'react'
import { Calculator, Flame, Utensils, Save, Upload } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import './TDEECalculator.css'

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', multiplier: 1.2, desc: 'Little or no exercise' },
  { value: 'light', label: 'Light', multiplier: 1.375, desc: '1-3 days/week' },
  { value: 'moderate', label: 'Moderate', multiplier: 1.55, desc: '3-5 days/week' },
  { value: 'very', label: 'Very Active', multiplier: 1.725, desc: '6-7 days/week' },
  { value: 'extreme', label: 'Extreme', multiplier: 1.9, desc: 'Athlete / physical job' },
]

const GOALS = [
  { value: 'lose', label: 'Lose Weight', adjustment: -500 },
  { value: 'maintain', label: 'Maintain', adjustment: 0 },
  { value: 'gain', label: 'Gain Weight', adjustment: 500 },
]

const STORAGE_KEY = 'tdee_calculator_data'

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

function calculateBMR(weight, height, age, sex) {
  if (!weight || !height || !age) return 0
  const w = parseFloat(weight)
  const h = parseFloat(height)
  const a = parseInt(age)
  if (sex === 'male') {
    return 10 * w + 6.25 * h - 5 * a + 5
  }
  return 10 * w + 6.25 * h - 5 * a - 161
}

export default function TDEECalculator() {
  const { showToast } = useToast()
  const [form, setForm] = useState(() => {
    const saved = loadSaved()
    return saved || {
      age: '',
      weight: '',
      height: '',
      sex: 'male',
      activityLevel: 'moderate',
      goal: 'maintain',
    }
  })
  const [saved, setSaved] = useState(!!loadSaved())
  const [serverSaved, setServerSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch('/nutrition/settings').then(data => {
      if (data?.caloriesTarget) {
        setForm(p => ({
          ...p,
          weight: p.weight || '',
          height: p.height || '',
          age: p.age || '',
          sex: p.sex || 'male',
          activityLevel: p.activityLevel || 'moderate',
          goal: p.goal || 'maintain',
        }))
        setServerSaved(true)
      }
    }).catch(() => {})
  }, [])

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const bmr = useMemo(() => calculateBMR(form.weight, form.height, form.age, form.sex), [form.weight, form.height, form.age, form.sex])

  const activity = ACTIVITY_LEVELS.find(a => a.value === form.activityLevel) || ACTIVITY_LEVELS[0]
  const goal = GOALS.find(g => g.value === form.goal) || GOALS[0]

  const tdee = bmr * activity.multiplier
  const goalCalories = Math.round(tdee + goal.adjustment)

  const proteinG = Math.round((goalCalories * 0.3) / 4)
  const carbsG = Math.round((goalCalories * 0.4) / 4)
  const fatG = Math.round((goalCalories * 0.3) / 9)

  async function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    setSaved(true)
    setSaving(true)
    try {
      await apiFetch('/nutrition/settings', {
        method: 'PUT',
        body: JSON.stringify({
          caloriesTarget: goalCalories,
          proteinTarget: proteinG,
          carbsTarget: carbsG,
          fatTarget: fatG,
        }),
      })
      setServerSaved(true)
      showToast('Nutrition targets saved to your profile!')
    } catch {
      showToast('Saved locally. Could not save to server.')
    } finally {
      setSaving(false)
    }
  }

  function handleClear() {
    localStorage.removeItem(STORAGE_KEY)
    setForm({ age: '', weight: '', height: '', sex: 'male', activityLevel: 'moderate', goal: 'maintain' })
    setSaved(false)
    showToast('Cleared')
  }

  return (
    <div className="td-container">
      <div className="td-header">
        <h2 className="td-title">
          <Calculator size={22} /> TDEE Calculator
        </h2>
        {serverSaved && <span className="td-saved-badge"><Upload size={14} /> Server Sync</span>}
        {saved && <span className="td-saved-badge"><Save size={14} /> Local Saved</span>}
      </div>

      <div className="td-grid">
        <div className="td-form-section">
          <div className="td-field-row">
            <div className="td-field">
              <label>Age</label>
              <input name="age" type="number" min="10" max="120" value={form.age} onChange={handleChange} placeholder="25" className="td-input" />
            </div>
            <div className="td-field">
              <label>Weight (kg)</label>
              <input name="weight" type="number" step="0.1" min="20" max="400" value={form.weight} onChange={handleChange} placeholder="75" className="td-input" />
            </div>
            <div className="td-field">
              <label>Height (cm)</label>
              <input name="height" type="number" step="0.1" min="100" max="250" value={form.height} onChange={handleChange} placeholder="175" className="td-input" />
            </div>
          </div>

          <div className="td-field-row">
            <div className="td-field">
              <label>Sex</label>
              <select name="sex" value={form.sex} onChange={handleChange} className="td-input">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="td-field">
              <label>Activity Level</label>
              <select name="activityLevel" value={form.activityLevel} onChange={handleChange} className="td-input">
                {ACTIVITY_LEVELS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <span className="td-field-desc">{activity.desc}</span>
            </div>
            <div className="td-field">
              <label>Goal</label>
              <select name="goal" value={form.goal} onChange={handleChange} className="td-input">
                {GOALS.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="td-actions">
            <button className="td-save-btn" onClick={handleSave} disabled={!form.weight || !form.height || !form.age || saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save to Profile'}
            </button>
            <button className="td-clear-btn" onClick={handleClear}>Clear</button>
          </div>
        </div>

        <div className="td-results-section">
          {bmr > 0 ? (
            <>
              <div className="td-result-card td-bmr">
                <div className="td-result-value">{Math.round(bmr)}</div>
                <div className="td-result-label">Basal Metabolic Rate (BMR)</div>
                <div className="td-result-desc">Calories at complete rest</div>
              </div>

              <div className="td-result-card td-tdee">
                <div className="td-result-value">{Math.round(tdee)}</div>
                <div className="td-result-label">Total Daily Energy Expenditure</div>
                <div className="td-result-desc">With {activity.label.toLowerCase()} activity</div>
              </div>

              <div className="td-result-card td-goal-card">
                <div className="td-result-value td-goal-value">{goalCalories}</div>
                <div className="td-result-label">{goal.label} Calories</div>
                <div className="td-result-desc">{goal.adjustment > 0 ? '+' : ''}{goal.adjustment} kcal adjustment</div>
              </div>

              <div className="td-macro-card">
                <div className="td-macro-header">
                  <Utensils size={16} />
                  <span>Macro Breakdown</span>
                </div>
                <div className="td-macro-bars">
                  <div className="td-macro-row">
                    <div className="td-macro-label">
                      <span className="td-macro-name td-protein">Protein</span>
                      <span>{proteinG}g</span>
                    </div>
                    <div className="td-macro-track">
                      <div className="td-macro-fill td-fill-protein" style={{ width: '30%' }} />
                    </div>
                    <span className="td-macro-pct">30%</span>
                  </div>
                  <div className="td-macro-row">
                    <div className="td-macro-label">
                      <span className="td-macro-name td-carbs">Carbs</span>
                      <span>{carbsG}g</span>
                    </div>
                    <div className="td-macro-track">
                      <div className="td-macro-fill td-fill-carbs" style={{ width: '40%' }} />
                    </div>
                    <span className="td-macro-pct">40%</span>
                  </div>
                  <div className="td-macro-row">
                    <div className="td-macro-label">
                      <span className="td-macro-name td-fat">Fat</span>
                      <span>{fatG}g</span>
                    </div>
                    <div className="td-macro-track">
                      <div className="td-macro-fill td-fill-fat" style={{ width: '30%' }} />
                    </div>
                    <span className="td-macro-pct">30%</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="td-empty-results">
              <Flame size={48} />
              <p>Enter your details to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
