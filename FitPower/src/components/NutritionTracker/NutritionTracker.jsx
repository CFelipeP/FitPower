import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Sunrise, Sun, Moon, Cookie, Plus, X, Check, Droplets } from 'lucide-react'
import './NutritionTracker.css'

const MEALS = [
  { key: 'breakfastChecked', label: 'Breakfast', icon: Sunrise },
  { key: 'lunchChecked', label: 'Lunch', icon: Sun },
  { key: 'dinnerChecked', label: 'Dinner', icon: Moon },
  { key: 'snackChecked', label: 'Snack', icon: Cookie },
]

export default function NutritionTracker() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [meals, setMeals] = useState({
    breakfastChecked: false,
    lunchChecked: false,
    dinnerChecked: false,
    snackChecked: false,
  })
  const [waterGlasses, setWaterGlasses] = useState(0)
  const [macros, setMacros] = useState({
    caloriesConsumed: 0,
    proteinCurrent: 0,
    carbsCurrent: 0,
    fatCurrent: 0,
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({ caloriesConsumed: 0, proteinCurrent: 0, carbsCurrent: 0, fatCurrent: 0 })
  const [targets, setTargets] = useState({ calories: 1940, protein: 150, carbs: 220, fat: 65 })

  useEffect(() => {
    apiFetch('/nutrition/settings').then(s => {
      if (s?.caloriesTarget) {
        setTargets({
          calories: s.caloriesTarget,
          protein: s.proteinTarget,
          carbs: s.carbsTarget,
          fat: s.fatTarget,
        })
      }
    }).catch(() => {})
    apiFetch('/nutrition?date=today')
      .then(data => {
        if (data.breakfastChecked !== undefined) setMeals({
          breakfastChecked: data.breakfastChecked,
          lunchChecked: data.lunchChecked,
          dinnerChecked: data.dinnerChecked,
          snackChecked: data.snackChecked,
        })
        if (data.waterGlasses !== undefined) setWaterGlasses(data.waterGlasses)
        if (data.caloriesConsumed !== undefined) setMacros({
          caloriesConsumed: data.caloriesConsumed,
          proteinCurrent: data.proteinCurrent,
          carbsCurrent: data.carbsCurrent,
          fatCurrent: data.fatCurrent,
        })
      })
      .catch(() => showToast('Error loading nutrition data'))
      .finally(() => setLoading(false))
  }, [showToast])

  function showSaveSuccess() {
    const now = new Date()
    const hm = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
    showToast('Nutrition saved at ' + hm)
  }

  async function save(data) {
    try {
      await apiFetch('/nutrition', {
        method: 'POST',
        body: JSON.stringify({ date: 'today', ...data }),
      })
      showSaveSuccess()
    } catch {
      showToast('Error saving nutrition data')
    }
  }

  function toggleMeal(key) {
    const next = { ...meals, [key]: !meals[key] }
    setMeals(next)
    save(next)
  }

  function toggleWater(idx) {
    const next = idx < waterGlasses ? idx : idx + 1
    setWaterGlasses(next)
    save({ ...meals, waterGlasses: next })
  }

  function openEditModal() {
    setEditForm({
      caloriesConsumed: macros.caloriesConsumed,
      proteinCurrent: macros.proteinCurrent,
      carbsCurrent: macros.carbsCurrent,
      fatCurrent: macros.fatCurrent,
    })
    setModalOpen(true)
  }

  function handleEditChange(field, value) {
    setEditForm(prev => ({ ...prev, [field]: Number(value) || 0 }))
  }

  function saveMacros() {
    setMacros(editForm)
    setModalOpen(false)
    save({ ...meals, waterGlasses, ...editForm })
  }

  function macroPct(current, target) {
    return Math.min((current / target) * 100, 100)
  }

  if (loading) {
    return <div className="nt-container"><div className="nt-loading">Loading...</div></div>
  }

  return (
    <div className="nt-container">
      <div className="nt-meals-grid">
        {MEALS.map(m => {
          const checked = meals[m.key]
          const Icon = m.icon
          return (
            <div
              key={m.key}
              className={'nt-meal-card' + (checked ? ' nt-checked' : '')}
              onClick={() => toggleMeal(m.key)}
            >
              <div className="nt-meal-icon"><Icon size={20} /></div>
              <div className="nt-meal-name">{m.label}</div>
              <div className="nt-meal-check">{checked ? <Check size={14} /> : null}</div>
            </div>
          )
        })}
      </div>

      <div className="nt-card nt-water-section">
        <div className="nt-water-header">
          <span className="nt-water-title"><Droplets size={18} style={{ verticalAlign: 'middle', marginRight: 6, color: '#3b82f6' }} />Water Intake</span>
          <span className="nt-water-count">{waterGlasses}/8 glasses</span>
        </div>
        <div className="nt-water-grid">
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <div
              key={i}
              className={'nt-water-glass' + (i < waterGlasses ? ' nt-filled' : '')}
              onClick={() => toggleWater(i)}
            >
              <div className="nt-water-fill" style={{ height: i < waterGlasses ? '100%' : '0%' }} />
              <Droplets size={18} className="nt-water-glass-icon" />
            </div>
          ))}
        </div>
      </div>

      <div className="nt-card nt-macros-section">
        <div className="nt-macros-header">
          <span className="nt-macros-title">Macronutrients</span>
          <button className="nt-edit-btn" onClick={openEditModal}><Plus size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Edit Macros</button>
        </div>
        <div className="nt-macro-item">
          <div className="nt-macro-label-row">
            <span className="nt-macro-label">Protein</span>
            <span className="nt-macro-value">{macros.proteinCurrent}g / {targets.protein}g</span>
          </div>
          <div className="nt-macro-track">
            <div className="nt-macro-fill nt-protein" style={{ width: macroPct(macros.proteinCurrent, targets.protein) + '%' }} />
          </div>
        </div>
        <div className="nt-macro-item">
          <div className="nt-macro-label-row">
            <span className="nt-macro-label">Carbs</span>
            <span className="nt-macro-value">{macros.carbsCurrent}g / {targets.carbs}g</span>
          </div>
          <div className="nt-macro-track">
            <div className="nt-macro-fill nt-carbs" style={{ width: macroPct(macros.carbsCurrent, targets.carbs) + '%' }} />
          </div>
        </div>
        <div className="nt-macro-item">
          <div className="nt-macro-label-row">
            <span className="nt-macro-label">Fat</span>
            <span className="nt-macro-value">{macros.fatCurrent}g / {targets.fat}g</span>
          </div>
          <div className="nt-macro-track">
            <div className="nt-macro-fill nt-fat" style={{ width: macroPct(macros.fatCurrent, targets.fat) + '%' }} />
          </div>
        </div>
      </div>

      <div className="nt-summary-card">
        <div className="nt-summary-header">
          <span className="nt-summary-title">Today's Summary</span>
          <div className="nt-summary-calories">
            {macros.caloriesConsumed} <span>/ {targets.calories} kcal</span>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="nt-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="nt-modal">
            <div className="nt-modal-header">
              <span className="nt-modal-title">Edit Macros</span>
              <button className="nt-modal-close" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="nt-form-group">
              <label className="nt-form-label">Calories Consumed</label>
              <input
                className="nt-form-input"
                type="number"
                value={editForm.caloriesConsumed}
                onChange={e => handleEditChange('caloriesConsumed', e.target.value)}
              />
            </div>
            <div className="nt-form-row">
              <div className="nt-form-group">
                <label className="nt-form-label">Protein (g)</label>
                <input
                  className="nt-form-input"
                  type="number"
                  value={editForm.proteinCurrent}
                  onChange={e => handleEditChange('proteinCurrent', e.target.value)}
                />
              </div>
              <div className="nt-form-group">
                <label className="nt-form-label">Carbs (g)</label>
                <input
                  className="nt-form-input"
                  type="number"
                  value={editForm.carbsCurrent}
                  onChange={e => handleEditChange('carbsCurrent', e.target.value)}
                />
              </div>
              <div className="nt-form-group">
                <label className="nt-form-label">Fat (g)</label>
                <input
                  className="nt-form-input"
                  type="number"
                  value={editForm.fatCurrent}
                  onChange={e => handleEditChange('fatCurrent', e.target.value)}
                />
              </div>
            </div>
            <div className="nt-modal-footer">
              <button className="nt-btn nt-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="nt-btn nt-btn-primary" onClick={saveMacros}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
