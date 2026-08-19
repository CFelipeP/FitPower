import { useState, useEffect } from 'react'
import { Search, Dumbbell, Filter, X, ChevronDown, Clock, BarChart3, Video } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import './ExerciseLibrary.css'

const CATEGORIES = [
    { value: 'all', label: 'All' },
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back' },
    { value: 'legs', label: 'Legs' },
    { value: 'shoulders', label: 'Shoulders' },
    { value: 'arms', label: 'Arms' },
    { value: 'core', label: 'Core' },
    { value: 'cardio', label: 'Cardio' },
]

const DIFFICULTY_COLORS = {
    beginner: 'cm-difficulty-beginner',
    intermediate: 'cm-difficulty-intermediate',
    advanced: 'cm-difficulty-advanced',
}

export default function ExerciseLibrary() {
    const { showToast } = useToast()
    const [exercises, setExercises] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [category, setCategory] = useState('all')
    const [selected, setSelected] = useState(null)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => {
        let cancelled = false

        const params = new URLSearchParams()
        if (category !== 'all') params.set('category', category)
        if (debouncedSearch) params.set('search', debouncedSearch)

        apiFetch(`/exercises?${params.toString()}`)
            .then((data) => {
                if (!cancelled) setExercises(data)
            })
            .catch((err) => {
                if (!cancelled) {
                    showToast(err.message || 'Failed to load exercises')
                    setExercises([])
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => { cancelled = true }
    }, [category, debouncedSearch, showToast])

    return (
        <div className="cm-exercise-library">
            <header className="cm-el-header">
                <div className="cm-el-title-row">
                    <Dumbbell size={28} className="cm-el-logo" />
                    <h1 className="cm-el-title">My Exercises</h1>
                </div>
                <div className="cm-el-search-wrap">
                    <Search size={18} className="cm-el-search-icon" />
                    <input
                        className="cm-el-search"
                        type="text"
                        placeholder="Search exercises..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="cm-el-search-clear" onClick={() => setSearch('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>
            </header>

            <div className="cm-el-filter-bar">
                <Filter size={16} className="cm-el-filter-icon" />
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.value}
                        className={`cm-el-filter-btn ${category === cat.value ? 'active' : ''}`}
                        onClick={() => setCategory(cat.value)}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="cm-el-loading">
                    <div className="cm-el-spinner" />
                    <p>Loading exercises...</p>
                </div>
            ) : exercises.length === 0 ? (
                <div className="cm-el-empty">
                    <Dumbbell size={48} className="cm-el-empty-icon" />
                    <h3>No exercises found</h3>
                    <p>Try adjusting your search or filter to find what you&apos;re looking for.</p>
                </div>
            ) : (
                <div className="cm-el-grid">
                    {exercises.map((ex) => (
                        <div
                            key={ex._id || ex.id}
                            className="cm-el-card"
                            onClick={() => setSelected(ex)}
                        >
                            {ex.imageUrl && (
                                <div className="cm-el-card-img-wrap">
                                    <img loading="lazy"                                         className="cm-el-card-img"
                                        src={ex.imageUrl}
                                        alt={ex.name}
                                    />
                                </div>
                            )}
                            <div className="cm-el-card-body">
                                <div className="cm-el-card-tags">
                                    <span className="cm-el-badge cm-el-badge-category">
                                        {ex.category}
                                    </span>
                                    <span
                                        className={`cm-el-badge cm-el-difficulty ${DIFFICULTY_COLORS[ex.difficulty] || ''}`}
                                    >
                                        {ex.difficulty}
                                    </span>
                                </div>
                                <h3 className="cm-el-card-title">
                                    {ex.name}
                                    {ex.videoUrl && <Video size={14} className="exercise-video-icon" />}
                                </h3>
                                <div className="cm-el-card-meta">
                                    <span>
                                        <BarChart3 size={14} />
                                        {ex.muscleGroup}
                                    </span>
                                    <span>
                                        <Clock size={14} />
                                        {ex.equipment || 'Bodyweight'}
                                    </span>
                                </div>
                                <p className="cm-el-card-desc">{ex.description}</p>
                            </div>
                            <div className="cm-el-card-arrow">
                                <ChevronDown size={18} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selected && (
                <div className="cm-el-overlay" onClick={() => setSelected(null)}>
                    <div className="cm-el-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="cm-el-modal-close" onClick={() => setSelected(null)}>
                            <X size={20} />
                        </button>

                        {selected.imageUrl && (
                            <img loading="lazy"                                 className="cm-el-modal-img"
                                src={selected.imageUrl}
                                alt={selected.name}
                            />
                        )}

                        <div className="cm-el-modal-body">
                            <div className="cm-el-modal-tags">
                                <span className="cm-el-badge cm-el-badge-category">
                                    {selected.category}
                                </span>
                                <span
                                    className={`cm-el-badge cm-el-difficulty ${DIFFICULTY_COLORS[selected.difficulty] || ''}`}
                                >
                                    {selected.difficulty}
                                </span>
                            </div>

                            <h2 className="cm-el-modal-title">{selected.name}</h2>

                            <div className="cm-el-modal-info">
                                <div className="cm-el-modal-info-item">
                                    <BarChart3 size={16} />
                                    <span>Muscle Group: <strong>{selected.muscleGroup}</strong></span>
                                </div>
                                <div className="cm-el-modal-info-item">
                                    <Clock size={16} />
                                    <span>Equipment: <strong>{selected.equipment || 'Bodyweight'}</strong></span>
                                </div>
                            </div>

                            {selected.description && (
                                <div className="cm-el-modal-section">
                                    <h4>Description</h4>
                                    <p>{selected.description}</p>
                                </div>
                            )}

                            {selected.instructions && (
                                <div className="cm-el-modal-section">
                                    <h4>Instructions</h4>
                                    <p className="cm-el-modal-instructions">{selected.instructions}</p>
                                </div>
                            )}

                            {selected.linkedVideos && selected.linkedVideos.length > 0 && (
                                <div className="cm-el-modal-section">
                                    <h4>Video Demo</h4>
                                    <div className="exercise-video-container">
                                        <video
                                            src={`/api/${selected.linkedVideos[0].filePath}`}
                                            controls
                                            className="exercise-video"
                                            preload="metadata"
                                        />
                                    </div>
                                </div>
                            )}

                            {selected.videoUrl && selected.videoUrl.endsWith('.gif') ? (
                                <div className="exercise-video-container">
                                    <img
                                        src={selected.videoUrl}
                                        alt={`${selected.name} demo`}
                                        className="exercise-video cm-el-repo-gif"
                                        loading="lazy"
                                    />
                                    {selected.source === 'github_exercises_dataset' && (
                                        <span className="cm-el-attribution">© Gym visual — gymvisual.com</span>
                                    )}
                                </div>
                            ) : selected.videoUrl ? (
                                <div className="exercise-video-container">
                                    <iframe
                                        src={selected.videoUrl.replace('watch?v=', 'embed/')}
                                        title="Exercise demo"
                                        className="exercise-video"
                                        allowFullScreen
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
