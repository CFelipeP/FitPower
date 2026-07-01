import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Plus, X, Edit3, Trash2, Utensils } from 'lucide-react'

const emptyForm = {
  name: '', mealType: 'breakfast', description: '', calories: '', protein: '', carbs: '', fat: '',
  prepTime: '', difficulty: 'easy', imageUrl: '', ingredients: '', instructions: '', tags: '',
}

export default function AdminRecipes() {
  const { showToast } = useToast()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : ''
      const data = await apiFetch(`/recipes${q}`)
      setRecipes(Array.isArray(data) ? data : [])
    } catch { showToast('Error loading recipes') }
    finally { setLoading(false) }
  }, [search, showToast])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditing(null); setForm({ ...emptyForm }); setModalOpen(true)
  }

  function openEdit(r) {
    setEditing(r)
    setForm({
      name: r.name || '', mealType: r.mealType || 'breakfast', description: r.description || '',
      calories: r.calories?.toString() || '', protein: r.protein?.toString() || '',
      carbs: r.carbs?.toString() || '', fat: r.fat?.toString() || '',
      prepTime: r.prepTime?.toString() || '', difficulty: r.difficulty || 'easy',
      imageUrl: r.imageUrl || '', ingredients: Array.isArray(r.ingredients) ? r.ingredients.join('\n') : '',
      instructions: r.instructions || '', tags: '',
    })
    setModalOpen(true)
  }

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name) { showToast('Name is required'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name, mealType: form.mealType, description: form.description || null,
        calories: form.calories ? parseInt(form.calories) : null,
        protein: form.protein ? parseFloat(form.protein) : null,
        carbs: form.carbs ? parseFloat(form.carbs) : null,
        fat: form.fat ? parseFloat(form.fat) : null,
        prepTime: form.prepTime ? parseInt(form.prepTime) : null,
        difficulty: form.difficulty, imageUrl: form.imageUrl || null,
        ingredients: form.ingredients ? form.ingredients.split('\n').filter(Boolean) : [],
        instructions: form.instructions || null,
      }
      if (editing) {
        await apiFetch(`/recipes/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        showToast('Recipe updated!')
      } else {
        await apiFetch('/recipes', { method: 'POST', body: JSON.stringify(payload) })
        showToast('Recipe created!')
      }
      setModalOpen(false); load()
    } catch (e) { showToast(e.message || 'Error saving recipe') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/recipes/${id}`, { method: 'DELETE' })
      showToast('Recipe deleted'); setConfirmDelete(null); load()
    } catch { showToast('Error deleting recipe') }
  }

  const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }

  return (
    <div className="ad-main-content">
      <div className="ad-content-header">
        <h1 className="ad-content-title"><Utensils size={24} /> Recipes</h1>
        <div className="ad-content-actions">
          <input className="ad-content-search" placeholder="Search recipes..." value={search}
            onChange={e => setSearch(e.target.value)} />
          <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={openAdd}><Plus size={16} /> Add Recipe</button>
        </div>
      </div>

      <div className="ad-dash-card" style={{ margin: 24 }}>
        {loading ? <div style={{ padding: 32, textAlign: 'center' }}>Loading...</div> : recipes.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>No recipes found</div>
        ) : (
          <table className="ad-table">
            <thead><tr><th>Name</th><th>Type</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fat</th><th>Difficulty</th><th>Actions</th></tr></thead>
            <tbody>
              {recipes.map(r => (
                <tr key={r.id} className="ad-user-row">
                  <td><span style={{ fontWeight: 500 }}>{r.name}</span></td>
                  <td><span className="ad-tier-label">{mealLabels[r.mealType] || r.mealType}</span></td>
                  <td>{r.calories ?? '-'}</td>
                  <td>{r.protein ?? '-'}g</td>
                  <td>{r.carbs ?? '-'}g</td>
                  <td>{r.fat ?? '-'}g</td>
                  <td><span className={`ad-status-badge ad-status-${r.difficulty === 'easy' ? 'active' : 'pending'}`}>{r.difficulty}</span></td>
                  <td>
                    <button className="ad-btn ad-btn-secondary ad-btn-xs" style={{ marginRight: 4 }} onClick={() => openEdit(r)}>
                      <Edit3 size={12} />
                    </button>
                    {confirmDelete === r.id ? (
                      <span className="cg-confirm-group">
                        <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => handleDelete(r.id)}>Delete</button>
                        <button className="ad-btn ad-btn-secondary ad-btn-xs" onClick={() => setConfirmDelete(null)}>No</button>
                      </span>
                    ) : (
                      <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => setConfirmDelete(r.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="ad-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="ad-modal-content" style={{ maxWidth: 600 }}>
            <div className="ad-modal-header"><h3>{editing ? 'Edit Recipe' : 'New Recipe'}</h3>
              <button className="ad-modal-close" onClick={() => setModalOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 24 }}>
              <div style={{ gridColumn: '1 / -1' }}><label className="ad-form-label">Name *</label>
                <input name="name" value={form.name} onChange={handleChange} className="ad-content-search" style={{ width: '100%' }} required /></div>
              <div><label className="ad-form-label">Meal Type</label>
                <select name="mealType" value={form.mealType} onChange={handleChange} className="ad-content-search" style={{ width: '100%' }}>
                  <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option><option value="snack">Snack</option>
                </select></div>
              <div><label className="ad-form-label">Difficulty</label>
                <select name="difficulty" value={form.difficulty} onChange={handleChange} className="ad-content-search" style={{ width: '100%' }}>
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select></div>
              <div><label className="ad-form-label">Calories</label><input name="calories" type="number" value={form.calories} onChange={handleChange} className="ad-content-search" style={{ width: '100%' }} /></div>
              <div><label className="ad-form-label">Prep Time (min)</label><input name="prepTime" type="number" value={form.prepTime} onChange={handleChange} className="ad-content-search" style={{ width: '100%' }} /></div>
              <div><label className="ad-form-label">Protein (g)</label><input name="protein" type="number" step="0.1" value={form.protein} onChange={handleChange} className="ad-content-search" style={{ width: '100%' }} /></div>
              <div><label className="ad-form-label">Carbs (g)</label><input name="carbs" type="number" step="0.1" value={form.carbs} onChange={handleChange} className="ad-content-search" style={{ width: '100%' }} /></div>
              <div><label className="ad-form-label">Fat (g)</label><input name="fat" type="number" step="0.1" value={form.fat} onChange={handleChange} className="ad-content-search" style={{ width: '100%' }} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label className="ad-form-label">Image URL</label><input name="imageUrl" value={form.imageUrl} onChange={handleChange} className="ad-content-search" style={{ width: '100%' }} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label className="ad-form-label">Ingredients (one per line)</label>
                <textarea name="ingredients" value={form.ingredients} onChange={handleChange} rows={4} className="ad-content-search" style={{ width: '100%', resize: 'vertical' }} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label className="ad-form-label">Instructions</label>
                <textarea name="instructions" value={form.instructions} onChange={handleChange} rows={4} className="ad-content-search" style={{ width: '100%', resize: 'vertical' }} /></div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="ad-btn ad-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="ad-btn ad-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
