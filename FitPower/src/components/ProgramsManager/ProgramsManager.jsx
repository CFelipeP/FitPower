import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Trash2, Dumbbell, Clock, Users, Download, Star, UserPlus } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
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
    const { user } = useAuth()
    const [programs, setPrograms] = useState([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [selectedProgram, setSelectedProgram] = useState(null)
    const [showReviews, setShowReviews] = useState(false)
    const [enrolling, setEnrolling] = useState(null)
    const [difficultyFilter, setDifficultyFilter] = useState('all')

    const handleEnroll = async (programId) => {
        if (!user?.id) { showToast('Debes iniciar sesión'); return }
        setEnrolling(programId)
        try {
            await apiFetch('/enrollments', {
                method: 'POST',
                body: JSON.stringify({ userId: user.id, programId })
            })
            showToast('¡Inscripción exitosa!')
            loadPrograms()
        } catch (err) {
            showToast(err.message === 'El usuario ya está inscrito en este programa' ? 'Ya estás inscrito en este programa' : err.message || 'Error al inscribirse')
        } finally {
            setEnrolling(null)
        }
    }

    useEffect(() => {
        apiFetch('/programs')
            .then(d => setPrograms(d.programs || []))
            .catch(() => showToast('Error loading programs'))
            .finally(() => setLoading(false))
    }, [showToast])

    const loadPrograms = () => {
        apiFetch('/programs')
            .then(d => setPrograms(d.programs || []))
            .catch(() => showToast('Error refreshing programs'))
    }

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
        setSaving(true)
        try {
            const payload = {
                ...form,
                durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
                weeks: form.weeks ? Number(form.weeks) : undefined,
                sessionsPerWeek: form.sessionsPerWeek ? Number(form.sessionsPerWeek) : undefined
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
            showToast(err.message || 'Error saving program')
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
            showToast(err.message || 'Error deleting program')
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
                                        <td>
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
                                                        onClick={() => handleEnroll(p.id)}
                                                        disabled={enrolling === p.id}
                                                    >
                                                        {enrolling === p.id ? '...' : <><UserPlus size={14} /> Enroll</>}
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button className="pm-btn-icon" title="Edit" onClick={() => openEdit(p)}>
                                                            <Edit2 />
                                                        </button>
                                                        <button className="pm-btn-icon" title="Delete" onClick={() => confirmDelete(p)}>
                                                            <Trash2 />
                                                        </button>
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
        </div>
    )
}
