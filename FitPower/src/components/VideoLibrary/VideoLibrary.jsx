import { useState, useEffect, useRef, useCallback } from 'react'
import { Video, Upload, Search, X, Film, Trash2, Play, Edit, Save } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import './VideoLibrary.css'

const CATEGORIES = ['All', 'Exercise Demo', 'Coaching Session', 'Educational', 'Coach Feedback']

export default function VideoLibrary() {
    const { showToast } = useToast()
    const { role } = useAuth()
    const isCoach = role === 'coach'

    const [videos, setVideos] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('All')
    const [selected, setSelected] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [editing, setEditing] = useState(null)
    const [editForm, setEditForm] = useState({ title: '', description: '', category: '' })
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [dragActive, setDragActive] = useState(false)
    const [clients, setClients] = useState([])
    const [selectedClient, setSelectedClient] = useState('')
    const [feedbackText, setFeedbackText] = useState('')
    const [feedbackSending, setFeedbackSending] = useState(false)
    const fileInputRef = useRef(null)
    const dropRef = useRef(null)

    const loadVideos = useCallback(async () => {
        try {
            const data = await apiFetch('/videos')
            setVideos(Array.isArray(data) ? data : (data.videos || []))
        } catch {
            showToast('Error loading videos')
        } finally {
            setLoading(false)
        }
    }, [showToast])

    useEffect(() => {
        loadVideos()
    }, [loadVideos])

    useEffect(() => {
        if (!isCoach) return
        apiFetch('/clients').then(setClients).catch(() => {})
    }, [isCoach])

    const filtered = videos.filter(v => {
        if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false
        if (category !== 'All' && v.category !== category) return false
        return true
    })

    function handleDragEnter(e) {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(true)
    }

    function handleDragLeave(e) {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
    }

    function handleDragOver(e) {
        e.preventDefault()
        e.stopPropagation()
    }

    function handleDrop(e) {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        const files = e.dataTransfer.files
        if (files.length) handleFile(files[0])
    }

    function handleFileInput(e) {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
    }

    function handleFile(file) {
        const validTypes = ['video/mp4', 'video/webm', 'video/quicktime']
        if (!validTypes.includes(file.type)) {
            showToast('Please upload MP4, WebM or MOV video files')
            return
        }
        setUploading(true)
        setUploadProgress(0)

        const formData = new FormData()
        formData.append('video', file)

        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/videos/upload')

        const token = localStorage.getItem('token')
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                setUploadProgress(Math.round((e.loaded / e.total) * 100))
            }
        }

        xhr.onload = () => {
            setUploading(false)
            if (xhr.status >= 200 && xhr.status < 300) {
                showToast('Video uploaded successfully')
                loadVideos()
            } else {
                try {
                    const err = JSON.parse(xhr.responseText)
                    showToast(err.message || 'Upload failed')
                } catch {
                    showToast('Upload failed')
                }
            }
        }

        xhr.onerror = () => {
            setUploading(false)
            showToast('Upload failed')
        }

        xhr.send(formData)
    }

    async function handleDeleteVideo(id) {
        try {
            await apiFetch(`/videos/${id}`, { method: 'DELETE' })
            showToast('Video deleted')
            setConfirmDelete(null)
            setSelected(null)
            loadVideos()
        } catch {
            showToast('Error deleting video')
        }
    }

    function startEdit(v) {
        setEditing(v)
        setEditForm({ title: v.title || '', description: v.description || '', category: v.category || 'exercise_demo' })
    }

    async function handleUpdateVideo() {
        if (!editing || !editForm.title.trim()) return
        try {
            await apiFetch(`/videos/${editing.id}`, {
                method: 'PUT',
                body: JSON.stringify(editForm),
            })
            showToast('Video updated')
            setEditing(null)
            loadVideos()
        } catch {
            showToast('Error updating video')
        }
    }

    async function handleSendFeedback() {
        if (!selectedClient || !feedbackText.trim() || !selected) return
        setFeedbackSending(true)
        try {
            await apiFetch('/coach/video-feedback', {
                method: 'POST',
                body: JSON.stringify({
                    videoId: selected.id,
                    clientId: selectedClient,
                    message: feedbackText.trim(),
                }),
            })
            showToast('Feedback sent to client')
            setFeedbackText('')
            setSelectedClient('')
        } catch {
            showToast('Error sending feedback')
        } finally {
            setFeedbackSending(false)
        }
    }

    if (loading) {
        return <div className="vl-loading"><div className="vl-spinner" /></div>
    }

    return (
        <div className="vl-container">
            <div className="vl-header">
                <div className="vl-header-left">
                    <Video size={22} />
                    <h2 className="vl-title">Video Library</h2>
                    <span className="vl-count">{videos.length} videos</span>
                </div>
                <button className="vl-btn vl-btn-primary" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={16} /> Upload
                </button>
            </div>

            <div className="vl-toolbar">
                <div className="vl-search-wrap">
                    <Search size={16} />
                    <input className="vl-search" placeholder="Search videos..." value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className="vl-clear" onClick={() => setSearch('')}><X size={14} /></button>}
                </div>
                <div className="vl-filter-bar">
                    {CATEGORIES.map(cat => (
                        <button key={cat} className={`vl-filter-btn ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div
                ref={dropRef}
                className={`vl-dropzone ${dragActive ? 'vl-dropzone-active' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload size={28} />
                <p className="vl-dropzone-title">Drag & drop video files here</p>
                <p className="vl-dropzone-text">Supports MP4 and WebM</p>
                <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="vl-hidden-input" onChange={handleFileInput} />
            </div>

            {uploading && (
                <div className="vl-upload-progress">
                    <Film size={18} />
                    <div className="vl-upload-progress-bar">
                        <div className="vl-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <span className="vl-upload-progress-text">{uploadProgress}%</span>
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="vl-empty">
                    <Video size={48} />
                    <h3>{search || category !== 'All' ? 'No videos found' : 'No videos yet'}</h3>
                    <p>{search || category !== 'All' ? 'Try adjusting your search or filters.' : 'Upload your first video to get started.'}</p>
                </div>
            ) : (
                <div className="vl-grid">
                    {filtered.map(v => (
                        <div key={v.id || v._id} className="vl-card" onClick={() => setSelected(v)}>
                            <div className="vl-thumb-wrap">
                                {v.thumbnail_url ? (
                                    <img loading="lazy" src={v.thumbnail_url} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <Film size={36} />
                                )}
                                <div className="vl-play-overlay">
                                    <div className="vl-play-btn"><Play size={20} /></div>
                                </div>
                                {v.duration && <span className="vl-duration">{v.duration}</span>}
                            </div>
                            <div className="vl-card-body">
                                {v.category && <span className="vl-category-badge">{v.category}</span>}
                                <h4 className="vl-card-title">{v.title}</h4>
                                <div className="vl-card-meta">
                                    {v.duration && <span>{v.duration}</span>}
                                </div>
                                <div className="vl-card-actions" onClick={e => e.stopPropagation()}>
                                    <button className="vl-action-btn" onClick={() => setSelected(v)}><Play size={12} /> Preview</button>
                                    <button className="vl-action-btn vl-action-edit" onClick={() => startEdit(v)}><Edit size={12} /> Edit</button>
                                    <button className="vl-action-btn vl-action-del" onClick={() => { setConfirmDelete(v); setSelected(null) }}><Trash2 size={12} /> Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selected && (
                <div className="vl-overlay" onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
                    <div className="vl-modal" onClick={e => e.stopPropagation()}>
                        <button className="vl-modal-close" onClick={() => setSelected(null)}><X size={18} /></button>
                        <video className="vl-modal-video" src={selected.video_url || selected.url} controls autoPlay />
                        <div className="vl-modal-body">
                            {selected.category && <span className="vl-modal-category">{selected.category}</span>}
                            <h3 className="vl-modal-title">{selected.title}</h3>
                            <div className="vl-modal-meta">
                                {selected.duration && <span><Video size={14} /> {selected.duration}</span>}
                            </div>
                            {selected.description && <p className="vl-modal-desc">{selected.description}</p>}
                        </div>
                    </div>
                </div>
            )}

            {confirmDelete && (
                <div className="vl-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
                    <div className="vl-confirm">
                        <div className="vl-confirm-icon"><Trash2 size={22} /></div>
                        <h3>Delete video</h3>
                        <p>Are you sure you want to delete <strong>{confirmDelete.title}</strong>? This action cannot be undone.</p>
                        <div className="vl-confirm-actions">
                            <button className="vl-btn vl-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="vl-btn vl-btn-danger" onClick={() => handleDeleteVideo(confirmDelete.id || confirmDelete._id)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {editing && (
                <div className="vl-overlay" onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
                    <div className="vl-modal vl-edit-modal" onClick={e => e.stopPropagation()}>
                        <button className="vl-modal-close" onClick={() => setEditing(null)}><X size={18} /></button>
                        <div className="vl-edit-header">
                            <Edit size={20} />
                            <h3>Edit Video</h3>
                        </div>
                        <div className="vl-edit-body">
                            <label className="vl-edit-label">Title</label>
                            <input className="vl-edit-input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Video title" />
                            <label className="vl-edit-label">Description</label>
                            <textarea className="vl-edit-textarea" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="Video description" rows={3} />
                            <label className="vl-edit-label">Category</label>
                            <select className="vl-edit-select" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                                {CATEGORIES.filter(c => c !== 'All').map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="vl-edit-actions">
                            <button className="vl-btn vl-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                            <button className="vl-btn vl-btn-primary" onClick={handleUpdateVideo} disabled={!editForm.title.trim()}>
                                <Save size={14} /> Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCoach && (
                <div className="vl-coach-section">
                    <h3 className="vl-coach-title"><Video size={18} /> Video Feedback</h3>
                    <p className="vl-coach-subtitle">Send video feedback to your clients</p>
                    <select className="vl-client-select" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                        <option value="">Select a client...</option>
                        {clients.map(c => (
                            <option key={c.id || c._id} value={c.id || c._id}>
                                {c.firstName || c.name} {c.lastName || ''}
                            </option>
                        ))}
                    </select>
                    <textarea className="vl-feedback-textarea" placeholder="Write your feedback message..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} />
                    <button className="vl-btn vl-btn-primary" onClick={handleSendFeedback} disabled={feedbackSending || !selectedClient || !feedbackText.trim()}>
                        {feedbackSending ? 'Sending...' : 'Send Feedback'}
                    </button>
                </div>
            )}
        </div>
    )
}
