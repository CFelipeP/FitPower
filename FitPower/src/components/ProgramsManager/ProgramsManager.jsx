import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Edit2, Trash2, Dumbbell, Clock, Users, Download, Star, UserPlus, Eye, Copy, Loader2 } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { swalError } from '../../lib/alerts'
import { useToast } from '../../context/ToastContext'
import { exportProgramToPDF } from '../../lib/export'
import ProgramReviews from '../ProgramReviews/ProgramReviews'
import './ProgramsManager.css'

const emptyForm = {
    name: '',
    description: '',
    tag: '',
    durationMinutes: '',
    weeks: '',
    sessionsPerWeek: '',
    difficulty: 'beginner',
    image: ''
}

export default function ProgramsManager({ role }) {
    const { showToast } = useToast()
    const [programs, setPrograms] = useState([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [selectedProgram, setSelectedProgram] = useState(null)
    const [showReviews, setShowReviews] = useState(false)
    const [difficultyFilter, setDifficultyFilter] = useState('all')
    const [previewProgram, setPreviewProgram] = useState(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [bulkTarget, setBulkTarget] = useState(null)
    const [bulkClients, setBulkClients] = useState([])
    const [bulkSelected, setBulkSelected] = useState([])
    const [bulkSaving, setBulkSaving] = useState(false)

    const handleClone = async (p) => {
        try {
            await apiFetch(`/programs/${p.id}/clone`, { method: 'POST', body: JSON.stringify({}) })
            showToast('Program duplicated as draft')
            loadPrograms()
        } catch (err) {
            swalError(err.message || 'Could not duplicate the program')
        }
    }

    const handlePreview = async (p) => {
        setPreviewLoading(true)
        try {
            const detail = await apiFetch(`/programs/${p.id}`)
            setPreviewProgram(detail)
        } catch {
            swalError('Could not load the program preview')
        } finally {
            setPreviewLoading(false)
        }
    }

    const openBulk = async (p) => {
        setBulkTarget(p)
        setBulkSelected([])
        try {
            const clients = await apiFetch('/clients')
            setBulkClients(Array.isArray(clients) ? clients : [])
        } catch {
            setBulkClients([])
        }
    }

    const toggleBulk = (id) => {
        setBulkSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
    }

    const submitBulk = async () => {
        if (!bulkTarget || bulkSelected.length === 0) return
        setBulkSaving(true)
        try {
            const res = await apiFetch(`/programs/${bulkTarget.id}/bulk-enroll`, {
                method: 'POST',
                body: JSON.stringify({ userIds: bulkSelected }),
            })
            showToast(`Enrolled ${res?.enrolled ?? bulkSelected.length} client(s)${res?.skipped ? `, ${res.skipped} skipped` : ''}`)
            setBulkTarget(null)
            loadPrograms()
        } catch (err) {
            swalError(err.message || 'Could not assign the program')
        } finally {
            setBulkSaving(false)
        }
    }

    const loadPrograms = useCallback(() => {
        // Clients only ever see their own enrolled Programs (My Programs);
        // the global catalog is reserved for coaches/admins.
        const url = role === 'client' ? '/enrollments' : '/programs'
        return apiFetch(url)
            .then(d => setPrograms(role === 'client' ? (Array.isArray(d) ? d : []) : (d.programs || [])))
            .catch(() => swalError('Error loading programs'))
    }, [role])

    useEffect(() => {
        setLoading(true)
        loadPrograms().finally(() => setLoading(false))
    }, [loadPrograms])

    const openCreate = () => {
        setEditing(null)
        setForm(emptyForm)
        setModalOpen(true)
    }

    const openEdit = (prog) => {
        setEditing(prog)
        setForm({
            name: prog.name || '',
            description: prog.description || '',
            tag: prog.tag || '',
            durationMinutes: prog.durationMinutes?.toString() || '',
            weeks: prog.weeks?.toString() || '',
            sessionsPerWeek: prog.sessionsPerWeek?.toString() || '',
            difficulty: prog.difficulty || 'beginner',
            image: prog.image || ''
        })
        setModalOpen(true)
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.name?.trim()) {
            swalError('Program name is required')
            return
        }
        const duration = form.durationMinutes ? Number(form.durationMinutes) : null
        const weeks = form.weeks ? Number(form.weeks) : null
        const sessionsPerWeek = form.sessionsPerWeek ? Number(form.sessionsPerWeek) : null
        if (duration !== null && (!Number.isFinite(duration) || duration < 1 || duration > 999)) {
            swalError('Duration must be between 1 and 999 minutes')
            return
        }
        if (weeks !== null && (!Number.isFinite(weeks) || weeks < 1 || weeks > 52)) {
            swalError('Weeks must be between 1 and 52')
            return
        }
        if (sessionsPerWeek !== null && (!Number.isFinite(sessionsPerWeek) || sessionsPerWeek < 1 || sessionsPerWeek > 7)) {
            swalError('Sessions per week must be between 1 and 7')
            return
        }
        setSaving(true)
        try {
            const payload = {
                ...form,
                durationMinutes: duration ?? undefined,
                weeks: weeks ?? undefined,
                sessionsPerWeek: sessionsPerWeek ?? undefined
            }
            if (editing) {
                await apiFetch(`/programs/${editing.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                })
                showToast('Program updated successfully')
            } else {
                await apiFetch('/programs', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                })
                showToast('Program created successfully')
            }
            setModalOpen(false)
            loadPrograms()
        } catch (err) {
            swalError(err.message || 'Error saving program')
        } finally {
            setSaving(false)
        }
    }

    const confirmDelete = (prog) => {
        setDeleteTarget(prog)
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            await apiFetch(`/programs/${deleteTarget.id}`, { method: 'DELETE' })
            showToast('Program deleted successfully')
            setDeleteTarget(null)
            loadPrograms()
        } catch (err) {
            swalError(err.message || 'Error deleting program')
        }
    }

    const badgeClass = (difficulty) => {
        if (!difficulty) return 'pm-badge-gray'
        const map = { beginner: 'pm-badge-green', intermediate: 'pm-badge-orange', advanced: 'pm-badge-purple' }
        return map[difficulty.toLowerCase()] || 'pm-badge-gray'
    }

    return (
        <div className="pm-wrapper">
            {/* Header */}
            <div className="pm-header">
                <h2 className="pm-title">Programs</h2>
                {role !== 'client' && (
                    <button className="pm-btn pm-btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Add Program
                    </button>
                )}
            </div>

            {/* Difficulty Filter */}
            {!loading && programs.length > 0 && (
                <div className="pm-filter-bar">
                    <span className="pm-filter-label">Filter:</span>
                    {['all', 'beginner', 'intermediate', 'advanced'].map(d => (
                        <button
                            key={d}
                            className={`pm-filter-btn ${difficultyFilter === d ? 'pm-filter-active' : ''}`}
                            onClick={() => setDifficultyFilter(d)}
                        >
                            {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                        </button>
                    ))}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="pm-loading">
                    <div className="pm-spinner" />
                </div>
            )}

            {/* Table */}
            {!loading && programs.length === 0 && (
                <div className="pm-card">
                    <div className="pm-empty">{role !== 'client' ? 'No programs found. Click "Add Program" to create one.' : 'No programs available.'}</div>
                </div>
            )}

            {!loading && programs.length > 0 && (
                <div className="pm-card">
                    {(() => {
                        const filtered = difficultyFilter === 'all'
                            ? programs
                            : programs.filter(p => (p.difficulty || '').toLowerCase() === difficultyFilter)
                        return (
                    <div className="pm-table-wrap">
                        <table className="pm-table">
                            <thead>
                                <tr>
                                    <th>Program</th>
                                    <th>Tag</th>
                                    <th>Difficulty</th>
                                    <th>Duration</th>
                                    <th>Enrollments</th>
                                    <th>Trainer</th>
                                    <th style={{ width: 80 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#888' }}>
                                            No programs match this filter
                                        </td>
                                    </tr>
                                ) : filtered.map(p => (
                                    <tr key={p.id}>
                                        <td data-label="Program">
                                            <div className="pm-cell-name">
                                                <div className="pm-cell-icon">
                                                    <Dumbbell />
                                                </div>
                                                <div>
                                                    <div className="pm-cell-text">{p.name}</div>
                                                    {p.description && (
                                                        <div className="pm-cell-sub">{p.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Tag">
                                            {p.tag && (
                                                <span className="pm-badge pm-badge-orange">{p.tag}</span>
                                            )}
                                        </td>
                                        <td data-label="Difficulty">
                                            <span className={`pm-badge ${badgeClass(p.difficulty)}`}>
                                                {p.difficulty || '—'}
                                            </span>
                                        </td>
                                        <td data-label="Duration">
                                            {p.durationMinutes ? (
                                                <div className="pm-cell-meta">
                                                    <Clock />
                                                    {p.durationMinutes} min
                                                </div>
                                            ) : (
                                                <span style={{ color: '#888', fontSize: 13 }}>—</span>
                                            )}
                                        </td>
                                        <td data-label="Enrollments">
                                            {p.enrollments != null ? (
                                                <div className="pm-cell-meta">
                                                    <Users />
                                                    {p.enrollments}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#888', fontSize: 13 }}>—</span>
                                            )}
                                        </td>
                                        <td data-label="Trainer">
                                            {p.trainerName ? (
                                                <div className="pm-cell-trainer">
                                                    {p.trainerAvatar && (
                                                        <img loading="lazy"                                                             src={p.trainerAvatar}
                                                            alt=""
                                                            className="pm-cell-trainer-avatar"
                                                        />
                                                    )}
                                                    <span>{p.trainerName}</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#888', fontSize: 13 }}>—</span>
                                            )}
                                        </td>
                                        <td data-label="Actions" className="pm-actions-cell">
                                            <div className="pm-table-actions">
                                                <button className="pm-btn-icon" title="Export PDF" onClick={() => exportProgramToPDF(p)}>
                                                    <Download />
                                                </button>
                                                <button className="pm-btn-icon" title="View Details" onClick={() => { setSelectedProgram(p); setShowReviews(true) }}>
                                                    <Star />
                                                </button>
                                                {role === 'client' ? (
                                                    <button
                                                        className="pm-btn pm-btn-primary"
                                                        style={{ padding: '4px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                                                        onClick={() => handlePreview(p)}
                                                    >
                                                        <Eye size={14} /> Open Program
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button className="pm-btn-icon" title="Preview as client" onClick={() => handlePreview(p)}>
                                                            <Eye />
                                                        </button>
                                                        <button className="pm-btn-icon" title="Duplicate" onClick={() => handleClone(p)}>
                                                            <Copy />
                                                        </button>
                                                        {p.isOwner && (
                                                            <>
                                                                <button className="pm-btn-icon" title="Assign to clients" onClick={() => openBulk(p)}>
                                                                    <UserPlus />
                                                                </button>
                                                                <button className="pm-btn-icon" title="Edit" onClick={() => openEdit(p)}>
                                                                    <Edit2 />
                                                                </button>
                                                                <button className="pm-btn-icon" title="Delete" onClick={() => confirmDelete(p)}>
                                                                    <Trash2 />
                                                                </button>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    )})()}
                </div>
            )}

            {showReviews && selectedProgram && (
                <div className="pm-overlay pm-open" onClick={(e) => { if (e.target === e.currentTarget) { setShowReviews(false); setSelectedProgram(null) } }}>
                    <div className="pm-modal pm-modal-wide" onClick={e => e.stopPropagation()}>
                        <div className="pm-modal-header">
                            <h3 className="pm-modal-title">Reviews: {selectedProgram.name}</h3>
                            <button className="pm-modal-close" onClick={() => { setShowReviews(false); setSelectedProgram(null) }}><X /></button>
                        </div>
                        <div className="pm-form">
                            <ProgramReviews programId={selectedProgram.id} />
                        </div>
                    </div>
                </div>
            )}

            {/* Create / Edit Modal */}
            <div
                className={'pm-overlay' + (modalOpen ? ' pm-open' : '')}
                onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
            >
                <div className="pm-modal">
                    <div className="pm-modal-header">
                        <h3 className="pm-modal-title">{editing ? 'Edit Program' : 'Create Program'}</h3>
                        <button className="pm-modal-close" onClick={() => setModalOpen(false)}>
                            <X />
                        </button>
                    </div>

                    <form className="pm-form" onSubmit={handleSubmit}>
                        <div className="pm-field">
                            <label className="pm-label">Name *</label>
                            <input
                                className="pm-input"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="e.g. HIIT Inferno"
                                required
                            />
                        </div>

                        <div className="pm-field">
                            <label className="pm-label">Description</label>
                            <textarea
                                className="pm-textarea"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                placeholder="Brief program description..."
                            />
                        </div>

                        <div className="pm-form-row">
                            <div className="pm-field">
                                <label className="pm-label">Tag</label>
                                <input
                                    className="pm-input"
                                    name="tag"
                                    value={form.tag}
                                    onChange={handleChange}
                                    placeholder="e.g. High Intensity"
                                />
                            </div>
                            <div className="pm-field">
                                <label className="pm-label">Difficulty</label>
                                <select
                                    className="pm-select"
                                    name="difficulty"
                                    value={form.difficulty}
                                    onChange={handleChange}
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>
                        </div>

                        <div className="pm-form-row">
                            <div className="pm-field">
                                <label className="pm-label">Duration (min)</label>
                                <input
                                    className="pm-input"
                                    name="durationMinutes"
                                    type="number"
                                    min="1"
                                    value={form.durationMinutes}
                                    onChange={handleChange}
                                    placeholder="e.g. 45"
                                />
                            </div>
                            <div className="pm-field">
                                <label className="pm-label">Weeks</label>
                                <input
                                    className="pm-input"
                                    name="weeks"
                                    type="number"
                                    min="1"
                                    value={form.weeks}
                                    onChange={handleChange}
                                    placeholder="e.g. 12"
                                />
                            </div>
                        </div>

                        <div className="pm-form-row">
                            <div className="pm-field">
                                <label className="pm-label">Sessions / Week</label>
                                <input
                                    className="pm-input"
                                    name="sessionsPerWeek"
                                    type="number"
                                    min="1"
                                    max="7"
                                    value={form.sessionsPerWeek}
                                    onChange={handleChange}
                                    placeholder="e.g. 3"
                                />
                            </div>
                            <div className="pm-field">
                                <label className="pm-label">Image URL</label>
                                <input
                                    className="pm-input"
                                    name="image"
                                    value={form.image}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="pm-form-actions">
                            <button
                                type="button"
                                className="pm-btn pm-btn-secondary"
                                onClick={() => setModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="pm-btn pm-btn-primary"
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : editing ? 'Update Program' : 'Create Program'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <div
                className={'pm-overlay' + (deleteTarget ? ' pm-open' : '')}
                onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null) }}
            >
                <div className="pm-modal" style={{ maxWidth: 420 }}>
                    <div className="pm-modal-header">
                        <h3 className="pm-modal-title">Delete Program</h3>
                        <button className="pm-modal-close" onClick={() => setDeleteTarget(null)}>
                            <X />
                        </button>
                    </div>
                    <div className="pm-delete-body">
                        <div className="pm-delete-icon">
                            <Trash2 />
                        </div>
                        <p className="pm-delete-text">
                            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
                        </p>
                        <div className="pm-delete-actions">
                            <button className="pm-btn pm-btn-secondary" onClick={() => setDeleteTarget(null)}>
                                Cancel
                            </button>
                            <button className="pm-btn pm-btn-danger" onClick={handleDelete}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview as Client modal */}
            <div className={'pm-overlay' + (previewProgram ? ' pm-open' : '')} onClick={(e) => { if (e.target === e.currentTarget) setPreviewProgram(null) }}>
                <div className="pm-modal pm-modal-wide">
                    <div className="pm-modal-header">
                        <h3 className="pm-modal-title">Preview: {previewProgram?.name || ''}</h3>
                        <button className="pm-modal-close" onClick={() => setPreviewProgram(null)}><X /></button>
                    </div>
                    {previewLoading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}><Loader2 size={20} className="spin" /> Loading preview...</div>
                    ) : previewProgram ? (
                        <div className="pm-preview">
                            <div className="pm-preview-head">
                                <div className="pm-preview-name">{previewProgram.name}</div>
                                <div className="pm-preview-meta">
                                    {previewProgram.trainerName && <span>Coach: {previewProgram.trainerName}</span>}
                                    {previewProgram.durationMinutes ? <span>{previewProgram.durationMinutes} min</span> : null}
                                    {previewProgram.weeks ? <span>{previewProgram.weeks} weeks</span> : null}
                                    {previewProgram.sessionsPerWeek ? <span>{previewProgram.sessionsPerWeek}x/week</span> : null}
                                    {typeof previewProgram.progressPct === 'number' && <span>Progress: {previewProgram.progressPct}%</span>}
                                </div>
                                {previewProgram.description && <p className="pm-preview-desc">{previewProgram.description}</p>}
                                {typeof previewProgram.progressPct === 'number' && (
                                    <div style={{ marginTop: 12 }}>
                                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${previewProgram.progressPct}%`, background: 'var(--power-500)', borderRadius: 4, transition: 'width .3s' }} />
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                                            {previewProgram.completedCount ?? 0} / {previewProgram.totalSessions ?? 0} workouts completed
                                            {previewProgram.nextWorkout ? ` · Next: ${previewProgram.nextWorkout.title}` : ' · Program completed'}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="pm-preview-sessions">
                                <h4 className="pm-preview-section-title">Sessions</h4>
                                {(previewProgram.sessions || []).length === 0 ? (
                                    <p className="pm-preview-empty">This program has no sessions attached yet. Clients will only see program information.</p>
                                ) : (
                                    previewProgram.sessions.map((s, si) => (
                                        <div key={s.id || si} className="pm-preview-session">
                                            <div className="pm-preview-session-title">{s.title}</div>
                                            {(s.exercises || []).length === 0 ? (
                                                <p className="pm-preview-empty">No exercises in this session.</p>
                                            ) : (
                                                <ul className="pm-preview-ex-list">
                                                    {s.exercises.map((ex, ei) => (
                                                        <li key={ex.id || ei} className="pm-preview-ex">
                                                            <Dumbbell size={14} />
                                                            <span>{ex.name}</span>
                                                            <span className="pm-preview-ex-meta">
                                                                {ex.sets != null && `${ex.sets} sets`}
                                                                {ex.reps && ` · ${ex.reps} reps`}
                                                                {ex.weight && ` · ${ex.weight}`}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                            <p className="pm-preview-hint">This is exactly what your clients will see when they open this program.</p>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Bulk assign modal */}
            <div className={'pm-overlay' + (bulkTarget ? ' pm-open' : '')} onClick={(e) => { if (e.target === e.currentTarget) setBulkTarget(null) }}>
                <div className="pm-modal pm-modal-wide">
                    <div className="pm-modal-header">
                        <h3 className="pm-modal-title">Assign "{bulkTarget?.name}" to clients</h3>
                        <button className="pm-modal-close" onClick={() => setBulkTarget(null)}><X /></button>
                    </div>
                    {bulkClients.length === 0 ? (
                        <p className="pm-preview-empty" style={{ padding: 24 }}>No clients found. Clients appear here once they enroll in one of your programs.</p>
                    ) : (
                        <>
                            <div className="pm-bulk-list">
                                {bulkClients.map(c => (
                                    <label key={c.id} className={'pm-bulk-item' + (bulkSelected.includes(c.id) ? ' pm-bulk-selected' : '')}>
                                        <input
                                            type="checkbox"
                                            checked={bulkSelected.includes(c.id)}
                                            onChange={() => toggleBulk(c.id)}
                                        />
                                        <span className="pm-bulk-avatar">{(c.name || c.firstName || '?').charAt(0).toUpperCase()}</span>
                                        <span className="pm-bulk-name">{c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim()}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="pm-form-actions">
                                <button className="pm-btn pm-btn-secondary" onClick={() => setBulkTarget(null)}>Cancel</button>
                                <button
                                    className="pm-btn pm-btn-primary"
                                    onClick={submitBulk}
                                    disabled={bulkSaving || bulkSelected.length === 0}
                                >
                                    {bulkSaving ? <Loader2 size={14} className="spin" /> : <UserPlus size={14} />}
                                    Enroll {bulkSelected.length} client{bulkSelected.length !== 1 ? 's' : ''}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
