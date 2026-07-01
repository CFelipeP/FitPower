import { useState, useEffect, useMemo, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Search, Plus, X, Pencil, Trash2, Dumbbell, AlertCircle, ChevronDown, Play } from 'lucide-react'
import ExerciseDemoModal from '../ExerciseLibrary/ExerciseDemoModal'
import './WorkoutBuilder.css'

const CATEGORIES = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'full body']
const MUSCLES = ['pectorals', 'upper chest', 'lats', 'mid back', 'full back', 'quadriceps', 'hamstrings', 'glutes', 'deltoids', 'side delts', 'rear delts', 'biceps', 'triceps', 'abs', 'obliques', 'full body']
const EQUIPMENT = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'band', 'jump rope', 'none']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']

export default function WorkoutBuilder() {
    const { showToast } = useToast()
    const [exercises, setExercises] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterCat, setFilterCat] = useState('')
    const [filterDiff, setFilterDiff] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState(null)
    const [saving, setSaving] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [demoExercise, setDemoExercise] = useState(null)
    const [form, setForm] = useState({
        name: '', description: '', category: '', muscleGroup: '', equipment: '', difficulty: 'beginner', instructions: ''
    })

    const loadExercises = useCallback(async () => {
        try {
            const data = await apiFetch('/exercises')
            setExercises(data)
        } catch { showToast('Error loading exercises') }
        finally { setLoading(false) }
    }, [showToast])

    useEffect(() => { loadExercises() }, [loadExercises])

    function openCreate() {
        setForm({ name: '', description: '', category: '', muscleGroup: '', equipment: '', difficulty: 'beginner', instructions: '' })
        setEditing(null)
        setShowForm(true)
    }

    function openEdit(ex) {
        setForm({
            name: ex.name, description: ex.description || '', category: ex.category,
            muscleGroup: ex.muscleGroup || '', equipment: ex.equipment || '',
            difficulty: ex.difficulty, instructions: ex.instructions || ''
        })
        setEditing(ex)
        setShowForm(true)
    }

    async function handleSave() {
        if (!form.name.trim() || !form.category) {
            showToast('Name and category are required')
            return
        }
        setSaving(true)
        try {
            if (editing) {
                await apiFetch(`/exercises/${editing.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(form),
                })
                showToast('Exercise updated')
            } else {
                await apiFetch('/exercises', {
                    method: 'POST',
                    body: JSON.stringify(form),
                })
                showToast('Exercise created')
            }
            setShowForm(false); setEditing(null)
            await loadExercises()
        } catch (e) { showToast(e.message || 'Error saving') }
        finally { setSaving(false) }
    }

    async function handleDelete(id) {
        try {
            await apiFetch(`/exercises/${id}`, { method: 'DELETE' })
            showToast('Exercise deleted')
            setConfirmDelete(null)
            await loadExercises()
        } catch { showToast('Error deleting') }
    }

    const filtered = useMemo(() => {
        return exercises.filter(ex => {
            if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false
            if (filterCat && ex.category !== filterCat) return false
            if (filterDiff && ex.difficulty !== filterDiff) return false
            return true
        })
    }, [exercises, search, filterCat, filterDiff])

    const grouped = useMemo(() => {
        const map = {}
        filtered.forEach(ex => {
            const cat = ex.category || 'other'
            if (!map[cat]) map[cat] = []
            map[cat].push(ex)
        })
        return Object.entries(map)
    }, [filtered])

    if (loading) {
        return <div className="wb-loading"><div className="wb-spinner" /></div>
    }

    return (
        <div className="wb-container">
            <div className="wb-header">
                <div className="wb-header-left">
                    <Dumbbell size={20} />
                    <h2 className="wb-title">Workout Builder</h2>
                    <span className="wb-count">{exercises.length} exercises</span>
                </div>
                <button className="wb-btn wb-btn-primary" onClick={openCreate}>
                    <Plus size={16} /> <span>New</span>
                </button>
            </div>

            <div className="wb-toolbar">
                <div className="wb-search-wrap">
                    <Search size={16} />
                    <input className="wb-search" placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className="wb-clear" onClick={() => setSearch('')}><X size={14} /></button>}
                </div>
                <button className={'wb-filter-toggle' + (showFilters ? ' wb-active' : '')} onClick={() => setShowFilters(!showFilters)}>
                    <ChevronDown size={16} />
                </button>
            </div>

            {showFilters && (
                <div className="wb-filters">
                    <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                        <option value="">All categories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                    <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
                        <option value="">All difficulties</option>
                        {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                    </select>
                </div>
            )}

            <div className="wb-list">
                {grouped.length === 0 ? (
                    <div className="wb-empty">
                        <Dumbbell size={48} />
                        <p>{search || filterCat ? 'No exercises found' : 'No exercises yet. Create the first one!'}</p>
                        {!search && !filterCat && (
                            <button className="wb-btn wb-btn-primary" onClick={openCreate}>
                                <Plus size={16} /> Create exercise
                            </button>
                        )}
                    </div>
                ) : (
                    grouped.map(([cat, exs]) => (
                        <div key={cat} className="wb-group">
                            <h3 className="wb-group-title">{cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
                            <div className="wb-grid">
                                {exs.map(ex => (
                                    <div key={ex.id} className="wb-card">
                                        <div className="wb-card-body">
                                            <h4 className="wb-card-name" style={{cursor:'pointer'}} onClick={() => setDemoExercise(ex)}>{ex.name}</h4>
                                            {ex.description && <p className="wb-card-desc">{ex.description}</p>}
                                            <div className="wb-card-tags">
                                                {ex.muscleGroup && <span className="wb-tag wb-tag-muscle">{ex.muscleGroup}</span>}
                                                {ex.equipment && <span className="wb-tag wb-tag-equip">{ex.equipment}</span>}
                                                <span className={'wb-tag wb-tag-diff wb-diff-' + ex.difficulty}>
                                                    {ex.difficulty}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="wb-card-actions">
                                            <button className="wb-action-btn" onClick={() => setDemoExercise(ex)} title="View Demo">
                                                <Play size={14} />
                                            </button>
                                            <button className="wb-action-btn" onClick={() => openEdit(ex)} title="Edit">
                                                <Pencil size={14} />
                                            </button>
                                            <button className="wb-action-btn wb-action-del" onClick={() => setConfirmDelete(ex)} title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showForm && (
                <div className="wb-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditing(null) } }}>
                    <div className="wb-form">
                        <div className="wb-form-header">
                            <h3>{editing ? 'Edit exercise' : 'New exercise'}</h3>
                            <button className="wb-form-close" onClick={() => { setShowForm(false); setEditing(null) }}><X size={18} /></button>
                        </div>
                        <div className="wb-form-body">
                            <div className="wb-field">
                                <label>Name *</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bicep Curl" />
                            </div>
                            <div className="wb-field">
                                <label>Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                            </div>
                            <div className="wb-field-row">
                                <div className="wb-field">
                                    <label>Category *</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                        <option value="">Select...</option>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div className="wb-field">
                                    <label>Muscle</label>
                                    <select value={form.muscleGroup} onChange={e => setForm(f => ({ ...f, muscleGroup: e.target.value }))}>
                                        <option value="">Select...</option>
                                        {MUSCLES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="wb-field-row">
                                <div className="wb-field">
                                    <label>Equipment</label>
                                    <select value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))}>
                                        <option value="">Select...</option>
                                        {EQUIPMENT.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div className="wb-field">
                                    <label>Difficulty</label>
                                    <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                                        {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="wb-field">
                                <label>Instructions</label>
                                <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} rows={3} placeholder="Describe how to perform the exercise..." />
                            </div>
                        </div>
                        <div className="wb-form-footer">
                            <button className="wb-btn wb-btn-ghost" onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button>
                            <button className="wb-btn wb-btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : editing ? 'Update' : 'Create exercise'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {demoExercise && (
                <ExerciseDemoModal exercise={demoExercise} onClose={() => setDemoExercise(null)} />
            )}

            {confirmDelete && (
                <div className="wb-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
                    <div className="wb-confirm">
                        <div className="wb-confirm-icon"><AlertCircle size={24} /></div>
                        <h3>Delete exercise</h3>
                        <p>Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This action cannot be undone.</p>
                        <div className="wb-confirm-actions">
                            <button className="wb-btn wb-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="wb-btn wb-btn-danger" onClick={() => handleDelete(confirmDelete.id)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}