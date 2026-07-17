import { useState, useEffect, useRef } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import {
    Video, Upload, Trash2, X, Search, Play, Clock,
    HardDrive, Tag, Eye, EyeOff, AlertCircle, CheckCircle,
    Star, FileText
} from 'lucide-react'

const CATEGORIES = [
    { value: 'exercise_demo', label: 'Exercise Demo' },
    { value: 'coaching_session', label: 'Coaching Session' },
    { value: 'educational', label: 'Educational' },
    { value: 'coach_feedback', label: 'Coach Feedback' },
]

const CATEGORY_COLORS = {
    exercise_demo: '#22c55e',
    coaching_session: '#3b82f6',
    educational: '#a855f7',
    coach_feedback: '#f59e0b',
}

function formatDuration(sec) {
    if (!sec) return '--:--'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

function formatSize(bytes) {
    if (!bytes) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    let size = bytes
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
    return size.toFixed(1) + ' ' + units[i]
}

function timeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
}

export default function CoachTrainingVideos() {
    const { showToast } = useToast()
    const [videos, setVideos] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [showUpload, setShowUpload] = useState(false)
    const [filter, setFilter] = useState('')
    const [search, setSearch] = useState('')
    const fileInputRef = useRef(null)
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'exercise_demo',
        tags: '',
        is_featured: false,
    })
    const [selectedFile, setSelectedFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    const fetchVideos = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({ limit: '50' })
            if (filter) params.set('category', filter)
            if (search) params.set('search', search)
            const data = await apiFetch(`/videos?${params}`)
            setVideos(data.videos || [])
        } catch (err) {
            showToast(err.message || 'Error loading videos', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchVideos() }, [filter])

    useEffect(() => {
        if (!search) { fetchVideos(); return }
        const t = setTimeout(fetchVideos, 400)
        return () => clearTimeout(t)
    }, [search])

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const allowed = ['video/mp4', 'video/webm', 'video/quicktime']
        if (!allowed.includes(file.type)) {
            showToast('Only MP4, WebM, and MOV are allowed', 'error')
            return
        }
        if (file.size > 500 * 1024 * 1024) {
            showToast('Video exceeds 500MB limit', 'error')
            return
        }
        setSelectedFile(file)
        setPreviewUrl(URL.createObjectURL(file))
    }

    const handleUpload = async () => {
        if (!selectedFile || !form.title.trim()) {
            showToast('Title and video file are required', 'error')
            return
        }
        try {
            setUploading(true)
            const fd = new FormData()
            fd.append('video', selectedFile)
            fd.append('title', form.title.trim())
            fd.append('description', form.description.trim())
            fd.append('category', form.category)
            fd.append('is_featured', form.is_featured ? '1' : '0')
            if (form.tags.trim()) {
                const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
                fd.append('tags', JSON.stringify(tags))
            }
            await apiFetch('/videos', { method: 'POST', body: fd })
            showToast('Video uploaded successfully!', 'success')
            resetForm()
            fetchVideos()
        } catch (err) {
            showToast(err.message || 'Upload failed', 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (id) => {
        try {
            await apiFetch(`/videos/${id}`, { method: 'DELETE' })
            showToast('Video deleted', 'success')
            setDeleteConfirm(null)
            setVideos(prev => prev.filter(v => v.id !== id))
        } catch (err) {
            showToast(err.message || 'Delete failed', 'error')
        }
    }

    const resetForm = () => {
        setForm({ title: '', description: '', category: 'exercise_demo', tags: '', is_featured: false })
        setSelectedFile(null)
        setPreviewUrl(null)
        setShowUpload(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const videoStats = {
        total: videos.length,
        totalSize: videos.reduce((a, v) => a + (v.fileSizeBytes || 0), 0),
        totalDuration: videos.reduce((a, v) => a + (v.durationSeconds || 0), 0),
    }

    return (
        <div className="cd-main-content" style={{ padding: 24 }}>
            <div className="cd-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Video size={24} style={{ color: 'var(--power-500)' }} /> Training Videos
                </h1>
                <button className="cd-btn cd-btn-primary cd-btn-sm" onClick={() => setShowUpload(!showUpload)}>
                    {showUpload ? <><X size={16} /> Cancel</> : <><Upload size={16} /> Upload Video</>}
                </button>
            </div>

            {showUpload && (
                <div className="cd-card" style={{ marginBottom: 24, padding: 28, border: '1px solid rgba(168,85,247,.25)', background: 'rgba(168,85,247,.02)' }}>
                    <h3 className="cd-section-title-sm" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(168,85,247,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Upload size={18} style={{ color: '#a855f7' }} />
                        </div>
                        Upload New Video
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: previewUrl ? '1fr 1fr' : '1fr', gap: 28 }}>
                        <div>
                            <div className="cd-form-group">
                                <label className="cd-form-label"><Video size={14} /> Video File *</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="video/mp4,video/webm,video/quicktime"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                                <div
                                    className={`cd-file-drop ${selectedFile ? 'cd-has-file' : ''}`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {selectedFile ? (
                                        <>
                                            <CheckCircle size={28} className="cd-file-drop-check" />
                                            <div className="cd-file-drop-text"><strong>{selectedFile.name}</strong></div>
                                            <div className="cd-file-drop-sub">{formatSize(selectedFile.size)} — click to change</div>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={28} className="cd-file-drop-icon" />
                                            <div className="cd-file-drop-text"><strong>Click to upload</strong> or drag and drop</div>
                                            <div className="cd-file-drop-sub">MP4, WebM, MOV — max 500MB</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="cd-form-group">
                                <label className="cd-form-label"><Tag size={14} /> Title *</label>
                                <input
                                    className="cd-input"
                                    type="text"
                                    placeholder="e.g. Squat Form Guide"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                />
                            </div>

                            <div className="cd-form-group">
                                <label className="cd-form-label"><FileText size={14} /> Description</label>
                                <textarea
                                    className="cd-textarea"
                                    placeholder="Describe what this video covers, key tips, muscles targeted..."
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={3}
                                />
                                <div className="cd-form-hint">Visible to clients in the video library</div>
                            </div>

                            <div className="cd-form-row">
                                <div className="cd-form-group">
                                    <label className="cd-form-label"><Eye size={14} /> Category</label>
                                    <select
                                        className="cd-select"
                                        value={form.category}
                                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                    >
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="cd-form-group">
                                    <label className="cd-form-label"><Tag size={14} /> Tags</label>
                                    <input
                                        className="cd-input"
                                        type="text"
                                        placeholder="legs, beginner, form"
                                        value={form.tags}
                                        onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                    />
                                    <div className="cd-form-hint">Comma separated</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'rgba(255,255,255,.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,.05)', marginBottom: 24 }}>
                                <input
                                    type="checkbox"
                                    id="featured-check"
                                    checked={form.is_featured}
                                    onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                                    style={{ accentColor: 'var(--power-500)', width: 16, height: 16 }}
                                />
                                <label htmlFor="featured-check" style={{ fontSize: 13, color: '#a3a3a3', cursor: 'pointer', userSelect: 'none' }}>
                                    <Star size={13} style={{ verticalAlign: -2, marginRight: 4, color: '#f59e0b' }} />
                                    <strong style={{ color: '#e5e5e5' }}>Featured</strong> — highlighted in client library
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    className="cd-btn cd-btn-primary"
                                    onClick={handleUpload}
                                    disabled={uploading || !selectedFile || !form.title.trim()}
                                    style={{ opacity: uploading || !selectedFile || !form.title.trim() ? 0.5 : 1, minWidth: 160, justifyContent: 'center' }}
                                >
                                    {uploading ? (
                                        <><div className="cd-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: '#000 transparent' }} /> Uploading...</>
                                    ) : (
                                        <><Upload size={16} /> Upload Video</>
                                    )}
                                </button>
                                <button className="cd-btn cd-btn-secondary" onClick={resetForm}>Cancel</button>
                            </div>
                        </div>

                        {previewUrl && (
                            <div>
                                <label className="cd-form-label" style={{ marginBottom: 8 }}><Play size={14} /> Preview</label>
                                <video
                                    src={previewUrl}
                                    controls
                                    style={{ width: '100%', borderRadius: 12, background: '#000', maxHeight: 320, border: '1px solid rgba(255,255,255,.05)' }}
                                />
                                <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12, color: '#737373' }}>
                                    <span>{selectedFile?.type?.split('/')[1]?.toUpperCase()}</span>
                                    <span>{formatSize(selectedFile?.size)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="cd-grid-3" style={{ marginBottom: 24 }}>
                <div className="cd-card cd-kpi-card">
                    <div className="cd-kpi-icon-box cd-purple"><Video /></div>
                    <div className="cd-kpi-value">{videoStats.total}</div>
                    <div className="cd-kpi-label">Total Videos</div>
                </div>
                <div className="cd-card cd-kpi-card">
                    <div className="cd-kpi-icon-box cd-blue"><Clock /></div>
                    <div className="cd-kpi-value">{formatDuration(videoStats.totalDuration)}</div>
                    <div className="cd-kpi-label">Total Duration</div>
                </div>
                <div className="cd-card cd-kpi-card">
                    <div className="cd-kpi-icon-box cd-green"><HardDrive /></div>
                    <div className="cd-kpi-value">{formatSize(videoStats.totalSize)}</div>
                    <div className="cd-kpi-label">Storage Used</div>
                </div>
            </div>

            <div className="cd-card" style={{ marginBottom: 24, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#737373' }} />
                    <input
                        className="cd-input"
                        type="text"
                        placeholder="Search videos..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', paddingLeft: 36 }}
                    />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className={`cd-btn cd-btn-sm ${!filter ? 'cd-btn-primary' : 'cd-btn-outline'}`} onClick={() => setFilter('')}>All</button>
                    {CATEGORIES.map(c => (
                        <button
                            key={c.value}
                            className={`cd-btn cd-btn-sm ${filter === c.value ? 'cd-btn-primary' : 'cd-btn-outline'}`}
                            onClick={() => setFilter(c.value)}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#737373' }}>
                    <div className="cd-spinner" style={{ margin: '0 auto 12px' }} />
                    Loading videos...
                </div>
            ) : videos.length === 0 ? (
                <div className="cd-card" style={{ textAlign: 'center', padding: 60 }}>
                    <Video size={48} style={{ color: '#525252', marginBottom: 16 }} />
                    <h3 style={{ color: '#e5e5e5', fontSize: 18, marginBottom: 8 }}>No videos yet</h3>
                    <p style={{ color: '#737373', marginBottom: 20 }}>Upload your first training video to get started</p>
                    <button className="cd-btn cd-btn-primary" onClick={() => setShowUpload(true)}>
                        <Upload size={16} /> Upload Video
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {videos.map(video => (
                        <div key={video.id} className="cd-card" style={{ overflow: 'hidden', transition: 'transform .2s' }}>
                            <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9' }}>
                                <video
                                    src={`/api/${video.filePath}`}
                                    preload="metadata"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onMouseEnter={e => e.target.play()}
                                    onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0 }}
                                />
                                <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,.8)', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#fff' }}>
                                    {formatDuration(video.durationSeconds)}
                                </div>
                                {video.isFeatured && (
                                    <div style={{ position: 'absolute', top: 8, left: 8, background: 'var(--power-500)', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#fff', fontWeight: 600 }}>
                                        ★ Featured
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <h4 style={{ color: '#e5e5e5', fontSize: 15, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>{video.title}</h4>
                                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                                        {deleteConfirm === video.id ? (
                                            <>
                                                <button className="cd-btn cd-btn-sm" style={{ background: '#ef4444', color: '#fff', padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(video.id)}>Yes</button>
                                                <button className="cd-btn cd-btn-sm cd-btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setDeleteConfirm(null)}>No</button>
                                            </>
                                        ) : (
                                            <button className="cd-btn cd-btn-sm cd-btn-outline" style={{ padding: '4px 8px' }} onClick={() => setDeleteConfirm(video.id)}>
                                                <Trash2 size={14} style={{ color: '#ef4444' }} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {video.description && (
                                    <p style={{ color: '#a3a3a3', fontSize: 13, margin: '0 0 8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {video.description}
                                    </p>
                                )}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, color: CATEGORY_COLORS[video.category] || '#737373', background: (CATEGORY_COLORS[video.category] || '#737373') + '18', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                                        {CATEGORIES.find(c => c.value === video.category)?.label || video.category}
                                    </span>
                                    {video.tags && video.tags.map((tag, i) => (
                                        <span key={i} style={{ fontSize: 11, color: '#737373', background: 'rgba(255,255,255,.05)', padding: '2px 6px', borderRadius: 3 }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                {video.coachName && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.05)' }}>
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(168,85,247,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#a855f7', fontWeight: 700, flexShrink: 0 }}>
                                            {video.coachName[0]}
                                        </div>
                                        <span style={{ fontSize: 12, color: '#737373' }}>Uploaded by <strong style={{ color: '#a3a3a3', fontWeight: 500 }}>{video.coachName}</strong></span>
                                        <span style={{ fontSize: 11, color: '#525252', marginLeft: 'auto' }}>{timeAgo(video.createdAt)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
