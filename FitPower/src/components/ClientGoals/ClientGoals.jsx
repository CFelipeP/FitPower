import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Target, Plus, X, Trash2, Edit3, Calendar, CheckCircle } from 'lucide-react'
import './ClientGoals.css'

const emptyGoal = {
  title: '',
  description: '',
  targetValue: '',
  unit: 'kg',
  startDate: '',
  targetDate: '',
}

export default function ClientGoals() {
  const { showToast } = useToast()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [form, setForm] = useState({ ...emptyGoal })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const loadGoals = useCallback(async () => {
    try {
      const data = await apiFetch('/goals')
      setGoals(Array.isArray(data) ? data : [])
    } catch {
      showToast('Error loading goals')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadGoals() }, [loadGoals])

  function openAdd() {
    setEditingGoal(null)
    setForm({ ...emptyGoal })
    setModalOpen(true)
  }

  function openEdit(goal) {
    setEditingGoal(goal)
    setForm({
      title: goal.title || '',
      description: goal.description || '',
      targetValue: goal.targetValue?.toString() || '',
      unit: goal.unit || 'kg',
      startDate: goal.startDate ? goal.startDate.slice(0, 10) : '',
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : '',
    })
    setModalOpen(true)
  }

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.targetValue) {
      showToast('Title and target value are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        targetValue: parseFloat(form.targetValue),
        unit: form.unit,
        startDate: form.startDate || null,
        targetDate: form.targetDate || null,
      }
      if (editingGoal) {
        await apiFetch(`/goals/${editingGoal.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        showToast('Goal updated!')
      } else {
        await apiFetch('/goals', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        showToast('Goal created!')
      }
      setModalOpen(false)
      loadGoals()
    } catch (e) {
      showToast(e.message || 'Error saving goal')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/goals/${id}`, { method: 'DELETE' })
      showToast('Goal deleted')
      setConfirmDelete(null)
      loadGoals()
    } catch {
      showToast('Error deleting goal')
    }
  }

  function getProgress(goal) {
    if (!goal.currentValue || !goal.targetValue) return 0
    return Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="cg-container">
      <div className="cg-header">
        <h2 className="cg-title">
          <Target size={22} /> My Goals
        </h2>
        <button className="cg-add-btn" onClick={openAdd}>
          <Plus size={16} /> Add Goal
        </button>
      </div>

      {loading ? (
        <div className="cg-loading">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="cg-empty">
          <Target size={48} />
          <p>No goals set yet</p>
          <p className="cg-empty-sub">Set your first goal to start tracking progress</p>
          <button className="cg-add-btn" onClick={openAdd}>
            <Plus size={16} /> Create Goal
          </button>
        </div>
      ) : (
        <div className="cg-grid">
          {goals.map(goal => {
            const progress = getProgress(goal)
            const isCompleted = goal.currentValue != null && goal.targetValue != null && goal.currentValue >= goal.targetValue
            return (
              <div key={goal.id} className={`cg-card ${isCompleted ? 'cg-completed' : ''}`}>
                <div className="cg-card-header">
                  <div className="cg-card-title-row">
                    <h3 className="cg-card-title">{goal.title}</h3>
                    {isCompleted && <CheckCircle size={18} className="cg-check-icon" />}
                  </div>
                  <div className="cg-card-actions">
                    <button className="cg-action-btn" onClick={() => openEdit(goal)} title="Edit">
                      <Edit3 size={14} />
                    </button>
                    {confirmDelete === goal.id ? (
                      <div className="cg-confirm-group">
                        <button className="cg-confirm-yes" onClick={() => handleDelete(goal.id)}>Delete</button>
                        <button className="cg-confirm-no" onClick={() => setConfirmDelete(null)}>No</button>
                      </div>
                    ) : (
                      <button className="cg-action-btn cg-delete-btn" onClick={() => setConfirmDelete(goal.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {goal.description && <p className="cg-card-desc">{goal.description}</p>}
                <div className="cg-progress-section">
                  <div className="cg-progress-header">
                    <span className="cg-progress-value">
                      {goal.currentValue ?? 0} / {goal.targetValue} {goal.unit}
                    </span>
                    <span className="cg-progress-pct">{progress}%</span>
                  </div>
                  <div className="cg-progress-track">
                    <div
                      className={`cg-progress-fill ${isCompleted ? 'cg-fill-done' : ''}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="cg-card-footer">
                  {goal.startDate && (
                    <span className="cg-footer-item">
                      <Calendar size={12} /> {formatDate(goal.startDate)}
                    </span>
                  )}
                  {goal.targetDate && (
                    <span className="cg-footer-item">
                      <Calendar size={12} /> Due {formatDate(goal.targetDate)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div className="cg-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="cg-modal">
            <div className="cg-modal-header">
              <h3 className="cg-modal-title">
                <Target size={18} /> {editingGoal ? 'Edit Goal' : 'New Goal'}
              </h3>
              <button className="cg-modal-close" onClick={() => setModalOpen(false)}><X /></button>
            </div>
            <form className="cg-form" onSubmit={handleSubmit}>
              <div className="cg-field">
                <label>Title</label>
                <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Bench 100kg" required className="cg-input" />
              </div>
              <div className="cg-field">
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Optional details..." rows={2} className="cg-input" />
              </div>
              <div className="cg-field-row">
                <div className="cg-field">
                  <label>Target Value</label>
                  <input name="targetValue" type="number" step="0.1" value={form.targetValue} onChange={handleChange} required className="cg-input" />
                </div>
                <div className="cg-field">
                  <label>Unit</label>
                  <select name="unit" value={form.unit} onChange={handleChange} className="cg-input">
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                    <option value="reps">reps</option>
                    <option value="minutes">minutes</option>
                    <option value="km">km</option>
                    <option value="%">%</option>
                    <option value="kcal">kcal</option>
                  </select>
                </div>
              </div>
              <div className="cg-field-row">
                <div className="cg-field">
                  <label>Start Date</label>
                  <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className="cg-input" />
                </div>
                <div className="cg-field">
                  <label>Target Date</label>
                  <input name="targetDate" type="date" value={form.targetDate} onChange={handleChange} className="cg-input" />
                </div>
              </div>
              <button type="submit" className="cg-submit-btn" disabled={saving}>
                {saving ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
