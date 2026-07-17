import { useState, useEffect, useRef } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { Video, Search, Play, Clock, X, Tag, Star } from 'lucide-react'

const CATEGORIES = [
    { value: '', label: 'All' },
    { value: 'exercise_demo', label: 'Exercise Demos' },
    { value: 'coaching_session', label: 'Coaching Sessions' },
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

export default function ClientTrainingVideos() {
    const { showToast } = useToast()
    const [videos, setVideos] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('')
    const [search, setSearch] = useState('')
    const [selectedVideo, setSelectedVideo] = useState(null)

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

    const featured = videos.filter(v => v.isFeatured)
    const regular = videos.filter(v => !v.isFeatured)

    return (
        <div className="cd-main-content" style={{ padding: 24 }}>
            <div className="cd-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Video size={24} style={{ color: 'var(--power-500)' }} /> Training Videos
                </h1>
                <span style={{ color: '#737373', fontSize: 14 }}>{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
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
                <div style={{ textAlign: 'center', padding: 60, color: '#737373' }}>
                    <div className="cd-spinner" style={{ margin: '0 auto 12px' }} />
                    Loading videos...
                </div>
            ) : videos.length === 0 ? (
                <div className="cd-card" style={{ textAlign: 'center', padding: 60 }}>
                    <Video size={48} style={{ color: '#525252', marginBottom: 16 }} />
                    <h3 style={{ color: '#e5e5e5', fontSize: 18, marginBottom: 8 }}>No videos available yet</h3>
                    <p style={{ color: '#737373' }}>Your coach will upload training videos here soon</p>
                </div>
            ) : (
                <>
                    {featured.length > 0 && (
                        <div style={{ marginBottom: 32 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e5e5e5', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Star size={18} style={{ color: '#f59e0b' }} /> Featured
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                                {featured.map(video => (
                                    <VideoCard key={video.id} video={video} onClick={() => setSelectedVideo(video)} />
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        {featured.length > 0 && <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e5e5e5', marginBottom: 16 }}>All Videos</h2>}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                            {regular.map(video => (
                                <VideoCard key={video.id} video={video} onClick={() => setSelectedVideo(video)} />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {selectedVideo && (
                <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
            )}
        </div>
    )
}

function VideoCard({ video, onClick }) {
    const [hovered, setHovered] = useState(false)

    return (
        <div
            className="cd-card"
            style={{ overflow: 'hidden', cursor: 'pointer', transition: 'transform .2s, box-shadow .2s', transform: hovered ? 'translateY(-2px)' : 'none' }}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9' }}>
                <video
                    src={`/api/${video.filePath}`}
                    preload="metadata"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onMouseEnter={e => e.target.play()}
                    onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0 }}
                />
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: hovered ? 'rgba(0,0,0,.3)' : 'transparent', transition: 'background .2s'
                }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: '50%', background: 'rgba(168,85,247,.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: hovered ? 1 : 0, transform: hovered ? 'scale(1)' : 'scale(.8)', transition: 'all .2s'
                    }}>
                        <Play size={22} fill="#fff" color="#fff" style={{ marginLeft: 2 }} />
                    </div>
                </div>
                <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,.8)', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#fff' }}>
                    {formatDuration(video.durationSeconds)}
                </div>
                {video.isFeatured && (
                    <div style={{ position: 'absolute', top: 8, left: 8, background: '#f59e0b', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#000', fontWeight: 600 }}>
                        ★ Featured
                    </div>
                )}
            </div>
            <div style={{ padding: 16 }}>
                <h4 style={{ color: '#e5e5e5', fontSize: 15, fontWeight: 600, margin: '0 0 6px', lineHeight: 1.3 }}>{video.title}</h4>
                {video.description && (
                    <p style={{ color: '#a3a3a3', fontSize: 13, margin: '0 0 8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {video.description}
                    </p>
                )}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: CATEGORY_COLORS[video.category] || '#737373', background: (CATEGORY_COLORS[video.category] || '#737373') + '18', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                        {CATEGORIES.find(c => c.value === video.category)?.label || video.category}
                    </span>
                    <span style={{ fontSize: 11, color: '#525252', marginLeft: 'auto' }}>{timeAgo(video.createdAt)}</span>
                </div>
                {video.coachName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.05)' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(168,85,247,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#a855f7', fontWeight: 700, flexShrink: 0 }}>
                            {video.coachName[0]}
                        </div>
                        <span style={{ fontSize: 12, color: '#737373' }}>By <strong style={{ color: '#a3a3a3', fontWeight: 500 }}>{video.coachName}</strong></span>
                    </div>
                )}
            </div>
        </div>
    )
}

function VideoModal({ video, onClose }) {
    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handleEsc)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleEsc)
            document.body.style.overflow = ''
        }
    }, [onClose])

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
        }} onClick={onClose}>
            <div
                style={{ width: '100%', maxWidth: 900, position: 'relative' }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: -40, right: 0,
                        background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
                        fontSize: 14, display: 'flex', alignItems: 'center', gap: 6
                    }}
                >
                    <X size={20} /> Close
                </button>

                <video
                    src={`/api/${video.filePath}`}
                    controls
                    autoPlay
                    style={{ width: '100%', borderRadius: 8, background: '#000', maxHeight: '70vh' }}
                />

                <div style={{ marginTop: 16 }}>
                    <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>{video.title}</h2>
                    {video.description && (
                        <p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.5, margin: '0 0 12px' }}>{video.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: CATEGORY_COLORS[video.category] || '#737373', background: (CATEGORY_COLORS[video.category] || '#737373') + '18', padding: '3px 10px', borderRadius: 4, fontWeight: 500 }}>
                            {CATEGORIES.find(c => c.value === video.category)?.label || video.category}
                        </span>
                        {video.durationSeconds > 0 && (
                            <span style={{ fontSize: 13, color: '#737373', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={13} /> {formatDuration(video.durationSeconds)}
                            </span>
                        )}
                        {video.tags && video.tags.map((tag, i) => (
                            <span key={i} style={{ fontSize: 12, color: '#a3a3a3', background: 'rgba(255,255,255,.08)', padding: '2px 8px', borderRadius: 3 }}>
                                {tag}
                            </span>
                        ))}
                        {video.coachName && (
                            <span style={{ fontSize: 13, color: '#737373', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(168,85,247,.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#a855f7', fontWeight: 700 }}>
                                    {video.coachName[0]}
                                </span>
                                {video.coachName}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
