import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../../lib/api'
import { Search, Dumbbell } from 'lucide-react'
import './ExercisePicker.css'

/**
 * Reusable catalog search + select. Searches exercise_library (/exercises?search=)
 * and returns the picked exercise via onSelect(exercise). Non-destructive:
 * the caller decides what to do with the result (fill name, link exerciseId, ...).
 */
export default function ExercisePicker({ onSelect, placeholder = 'Search exercise catalog...', minChars = 2 }) {
    const [term, setTerm] = useState('')
    const [results, setResults] = useState([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const wrapRef = useRef(null)

    useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    useEffect(() => {
        if (!open || term.trim().length < minChars) {
            setResults([])
            return
        }
        setLoading(true)
        const t = setTimeout(async () => {
            try {
                const data = await apiFetch(`/exercises?search=${encodeURIComponent(term.trim())}`)
                setResults((Array.isArray(data) ? data : []).slice(0, 8))
            } catch {
                setResults([])
            } finally {
                setLoading(false)
            }
        }, 300)
        return () => clearTimeout(t)
    }, [term, open, minChars])

    function pick(ex) {
        setTerm('')
        setOpen(false)
        onSelect(ex)
    }

    return (
        <div className="ep-wrap" ref={wrapRef}>
            <div className="ep-input-row">
                <Search size={14} className="ep-search-icon" aria-hidden="true" />
                <input
                    className="ep-input"
                    type="text"
                    value={term}
                    placeholder={placeholder}
                    aria-label={placeholder}
                    autoComplete="off"
                    onChange={(e) => { setTerm(e.target.value); setOpen(true) }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
                />
            </div>
            {open && term.trim().length >= minChars && (
                <div className="ep-dropdown" role="listbox">
                    {loading && <div className="ep-empty">Searching…</div>}
                    {!loading && results.length === 0 && <div className="ep-empty">No exercises found</div>}
                    {results.map((ex) => (
                        <button
                            key={ex.id}
                            type="button"
                            role="option"
                            className="ep-item"
                            onClick={() => pick(ex)}
                        >
                            <Dumbbell size={14} className="ep-item-icon" aria-hidden="true" />
                            <span className="ep-item-text">
                                <span className="ep-item-name">
                                    {ex.name}
                                    {ex.source === 'github_exercises_dataset' && (
                                        <span className="ep-item-repo">REPO</span>
                                    )}
                                </span>
                                <span className="ep-item-meta">
                                    {[ex.category, ex.muscleGroup, ex.equipment].filter(Boolean).join(' · ')}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
