import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { FileText, Plus, Trash2, X, Tag, Calendar } from 'lucide-react'
import './ClientNotesPanel.css'

const CATEGORIES = ['general','nutrition','training','progress','health']
const CATEGORY_COLORS = {
    general: '#60a5fa',
    nutrition: '#4ade80',
    training: '#a78bfa',
    progress: '#f59e0b',
    health: '#f87171',
}

export default function ClientNotesPanel({ selectedClientId, onSelectClient }) {
    const { showToast } = useToast()
    const [clients, setClients] = useState([])
    const [notes, setNotes] = useState([])
    const [loading, setLoading] = useState(true)
    const [notesLoading, setNotesLoading] = useState(false)
    const [showNewNote, setShowNewNote] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newContent, setNewContent] = useState('')
    const [newCategory, setNewCategory] = useState('general')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        apiFetch('/dashboard/coach')
            .then(d => setClients(d?.clientRoster || []))
            .catch(() => showToast('Error loading clients'))
            .finally(() => setLoading(false))
    }, [showToast])

    const loadNotes = useCallback(async () => {
        if (!selectedClientId) { setNotes([]); return }
        setNotesLoading(true)
        try {
            const data = await apiFetch(`/coach/clients/${selectedClientId}/notes`)
            setNotes(Array.isArray(data) ? data : [])
        } catch {
            showToast('Error loading notes')
        } finally {
            setNotesLoading(false)
        }
    }, [selectedClientId, showToast])

    useEffect(() => { loadNotes() }, [loadNotes])

    const handleCreateNote = async () => {
        if (!newTitle.trim()) return
        setSaving(true)
        try {
            await apiFetch(`/coach/clients/${selectedClientId}/notes`, {
                method: 'POST',
                body: JSON.stringify({ title: newTitle.trim(), content: newContent.trim(), category: newCategory }),
            })
            setNewTitle('')
            setNewContent('')
            setNewCategory('general')
            setShowNewNote(false)
            loadNotes()
            showToast('Note created')
        } catch {
            showToast('Error creating note')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteNote = async (noteId) => {
        try {
            await apiFetch(`/coach/notes/${noteId}`, { method: 'DELETE' })
            setNotes(prev => prev.filter(n => n.id !== noteId))
            showToast('Note deleted')
        } catch {
            showToast('Error deleting note')
        }
    }

    const formatDate = (d) => {
        if (!d) return ''
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    if (loading) return <div className="cnp-loading">Loading clients...</div>

    if (!selectedClientId) {
        return (
            <div className="cnp-container">
                <div className="cnp-header">
                    <h2 className="cnp-title"><FileText size={22} /> Client Notes</h2>
                    <span className="cnp-sub">{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="cnp-client-list">
                    {clients.map((c, i) => (
                        <div key={i} className="cnp-client-card" onClick={() => onSelectClient(c.seed || c.name)}>
                            {c.photo
                                ? <img loading="lazy" src={c.photo} alt="" className="cnp-client-avatar" />
                                : <div className="cnp-client-avatar cnp-avatar-placeholder">{(c.name||'?')[0]}</div>
                            }
                            <div className="cnp-client-info">
                                <div className="cnp-client-name">{c.name}</div>
                                <div className="cnp-client-prog">{c.prog || 'No program'}</div>
                            </div>
                            <div className="cnp-client-status" data-status={c.statusCls || 'on-track'}>{c.status}</div>
                        </div>
                    ))}
                    {clients.length === 0 && <p className="cnp-empty">No clients found</p>}
                </div>
            </div>
        )
    }

    const selectedClient = clients.find(c => String(c.seed) === String(selectedClientId))

    return (
        <div className="cnp-container">
            <div className="cnp-header">
                <div className="cnp-header-left">
                    <button className="cnp-back-btn" onClick={() => onSelectClient(null)}>← Back</button>
                    <h2 className="cnp-title">
                        <FileText size={22} />
                        Notes: {selectedClient?.name || 'Client'}
                    </h2>
                </div>
                <button className="cnp-new-btn" onClick={() => setShowNewNote(true)}>
                    <Plus size={16} /> New Note
                </button>
            </div>

            {showNewNote && (
                <div className="cnp-new-note-form">
                    <div className="cnp-form-row">
                        <input
                            type="text"
                            placeholder="Note title..."
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            className="cnp-input"
                            autoFocus
                        />
                        <button className="cnp-form-close" onClick={() => setShowNewNote(false)}><X size={16} /></button>
                    </div>
                    <textarea
                        placeholder="Write your note..."
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        className="cnp-textarea"
                        rows={3}
                    />
                    <div className="cnp-form-footer">
                        <div className="cnp-category-selector">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    className={'cnp-cat-btn' + (newCategory === cat ? ' cnp-cat-active' : '')}
                                    style={newCategory === cat ? { borderColor: CATEGORY_COLORS[cat], color: CATEGORY_COLORS[cat] } : {}}
                                    onClick={() => setNewCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <button
                            className="cnp-submit-btn"
                            onClick={handleCreateNote}
                            disabled={saving || !newTitle.trim()}
                        >
                            {saving ? 'Saving...' : 'Save Note'}
                        </button>
                    </div>
                </div>
            )}

            {notesLoading ? (
                <div className="cnp-loading">Loading notes...</div>
            ) : notes.length === 0 ? (
                <div className="cnp-empty-state">
                    <FileText size={48} />
                    <p>No notes yet for this client</p>
                    <button className="cnp-new-btn" onClick={() => setShowNewNote(true)}>
                        <Plus size={16} /> Create First Note
                    </button>
                </div>
            ) : (
                <div className="cnp-notes-list">
                    {notes.map(n => (
                        <div key={n.id} className="cnp-note-card">
                            <div className="cnp-note-header">
                                <div className="cnp-note-title-row">
                                    <h3 className="cnp-note-title">{n.title}</h3>
                                    <span
                                        className="cnp-note-category"
                                        style={{ background: `${CATEGORY_COLORS[n.category] || CATEGORY_COLORS.general}1A`, color: CATEGORY_COLORS[n.category] || CATEGORY_COLORS.general }}
                                    >
                                        <Tag size={10} /> {n.category}
                                    </span>
                                </div>
                                <button className="cnp-delete-btn" onClick={() => handleDeleteNote(n.id)} title="Delete note">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {n.content && <p className="cnp-note-content">{n.content}</p>}
                            <div className="cnp-note-meta">
                                <Calendar size={12} />
                                <span>{formatDate(n.createdAt)}</span>
                                {n.coachName && <span>by {n.coachName}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
