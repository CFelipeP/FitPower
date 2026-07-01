import { useState } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Dumbbell, Plus, X, Calendar, Clock, Target } from 'lucide-react'
import './AssignRoutine.css'

const emptyExercise = { name: '', sets: '', reps: '', restTime: '' }

export default function AssignRoutine({ clientId }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    date: '',
    title: '',
    focusArea: '',
    duration: '',
  })
  const [exercises, setExercises] = useState([{ ...emptyExercise }])
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  function addExercise() {
    setExercises(p => [...p, { ...emptyExercise }])
  }

  function removeExercise(index) {
    setExercises(p => p.filter((_, i) => i !== index))
  }

  function updateExercise(index, field, value) {
    setExercises(p => p.map((ex, i) =>
      i === index ? { ...ex, [field]: value } : ex
    ))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!clientId) {
      showToast('No client selected')
      return
    }
    if (!form.date || !form.title) {
      showToast('Date and title are required')
      return
    }
    const validExercises = exercises.filter(ex => ex.name.trim())
    if (validExercises.length === 0) {
      showToast('Add at least one exercise')
      return
    }

    setSubmitting(true)
    try {
      await apiFetch(`/coach/clients/${clientId}/routines`, {
        method: 'POST',
        body: JSON.stringify({
          date: form.date,
          title: form.title,
          focusArea: form.focusArea || null,
          duration: form.duration ? parseInt(form.duration) : null,
          exercises: validExercises.map(ex => ({
            name: ex.name,
            sets: ex.sets ? parseInt(ex.sets) : null,
            reps: ex.reps || null,
            restTime: ex.restTime || null,
          })),
        }),
      })
      showToast('Routine assigned!')
      setForm({ date: '', title: '', focusArea: '', duration: '' })
      setExercises([{ ...emptyExercise }])
      setShowForm(false)
    } catch (e) {
      showToast(e.message || 'Error assigning routine')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="ar-container">
      <div className="ar-header">
        <h2 className="ar-title">
          <Dumbbell size={22} /> Assign Routine
        </h2>
        <button className="ar-add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Routine'}
        </button>
      </div>

      {showForm && (
        <form className="ar-form" onSubmit={handleSubmit}>
          <div className="ar-form-grid">
            <div className="ar-field">
              <label><Calendar size={14} /> Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} required className="ar-input" />
            </div>
            <div className="ar-field">
              <label><Dumbbell size={14} /> Title</label>
              <input type="text" name="title" placeholder="e.g. Upper Body Push" value={form.title} onChange={handleChange} required className="ar-input" />
            </div>
            <div className="ar-field">
              <label><Target size={14} /> Focus Area</label>
              <select name="focusArea" value={form.focusArea} onChange={handleChange} className="ar-input">
                <option value="">Select...</option>
                <option value="chest">Chest</option>
                <option value="back">Back</option>
                <option value="shoulders">Shoulders</option>
                <option value="legs">Legs</option>
                <option value="arms">Arms</option>
                <option value="full_body">Full Body</option>
                <option value="core">Core</option>
                <option value="cardio">Cardio</option>
              </select>
            </div>
            <div className="ar-field">
              <label><Clock size={14} /> Duration (min)</label>
              <input type="number" name="duration" placeholder="e.g. 45" value={form.duration} onChange={handleChange} min="1" className="ar-input" />
            </div>
          </div>

          <div className="ar-exercises-section">
            <div className="ar-exercises-header">
              <span className="ar-exercises-title">Exercises</span>
              <button type="button" className="ar-btn ar-btn-sm" onClick={addExercise}>
                <Plus size={14} /> Add Exercise
              </button>
            </div>

            {exercises.map((ex, i) => (
              <div key={i} className="ar-exercise-row">
                <div className="ar-exercise-top">
                  <input
                    type="text"
                    placeholder="Exercise name"
                    value={ex.name}
                    onChange={e => updateExercise(i, 'name', e.target.value)}
                    required
                    className="ar-input ar-ex-name"
                  />
                  {exercises.length > 1 && (
                    <button type="button" className="ar-remove-btn" onClick={() => removeExercise(i)}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="ar-exercise-inputs">
                  <input
                    type="number"
                    placeholder="Sets"
                    value={ex.sets}
                    onChange={e => updateExercise(i, 'sets', e.target.value)}
                    min="1"
                    className="ar-input ar-input-sm"
                  />
                  <input
                    type="text"
                    placeholder="Reps (e.g. 10-12)"
                    value={ex.reps}
                    onChange={e => updateExercise(i, 'reps', e.target.value)}
                    className="ar-input ar-input-sm"
                  />
                  <input
                    type="text"
                    placeholder="Rest (e.g. 60s)"
                    value={ex.restTime}
                    onChange={e => updateExercise(i, 'restTime', e.target.value)}
                    className="ar-input ar-input-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="ar-submit-btn" disabled={submitting}>
            {submitting ? 'Assigning...' : 'Assign Routine'}
          </button>
        </form>
      )}

      {!showForm && (
        <div className="ar-placeholder">
          <Dumbbell size={48} />
          <p>Create a new routine to assign to this client</p>
          <button className="ar-add-btn" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create Routine
          </button>
        </div>
      )}
    </div>
  )
}
