import { useState, useEffect, useCallback } from 'react'
import { Dumbbell, Clock, CheckCircle, Target, RotateCw } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import './SmartRoutine.css'

export default function SmartRoutine() {
    const { showToast } = useToast()
    const [routine, setRoutine] = useState(null)
    const [loading, setLoading] = useState(true)
    const [completing, setCompleting] = useState(false)

    const loadRoutine = useCallback(async () => {
        try {
            const data = await apiFetch('/routines/daily')
            setRoutine(data)
        } catch (e) {
            showToast('Error loading routine')
        }
    }, [showToast])

    useEffect(() => {
        loadRoutine().finally(() => setLoading(false))
    }, [loadRoutine])

    const completeRoutine = async () => {
        setCompleting(true)
        try {
            await apiFetch('/routines/complete', { method: 'POST', body: JSON.stringify({}) })
            showToast('¡Rutina completada! +20 puntos')
            loadRoutine()
        } catch (e) { showToast(e.message) }
        setCompleting(false)
    }

    if (loading) return <div className="sr-card"><div className="sr-loading">Generando rutina inteligente...</div></div>

    return (
        <div className="sr-card">
            <div className="sr-header">
                <div className="sr-title-row">
                    <Dumbbell className="sr-icon" />
                    <div>
                        <h3 className="sr-title">Rutina de Hoy</h3>
                        <p className="sr-subtitle">{routine?.title || 'Powered by FitPower AI'}</p>
                    </div>
                </div>
                <div className="sr-meta">
                    <span className="sr-badge"><Clock size={12} /> {routine?.duration_minutes || 0} min</span>
                    <span className="sr-badge sr-badge-yellow"><Target size={12} /> {routine?.focus || ''}</span>
                    {routine?.is_completed ? (
                        <span className="sr-badge sr-badge-green"><CheckCircle size={12} /> Completado</span>
                    ) : (
                        <span className="sr-badge sr-badge-dim">{routine?.difficulty || ''}</span>
                    )}
                </div>
            </div>
            <div className="sr-exercises">
                {(routine?.exercises || []).map((ex, i) => (
                    <div key={i} className="sr-exercise">
                        <div className="sr-ex-num">{i + 1}</div>
                        <div className="sr-ex-info">
                            <div className="sr-ex-name">{ex.name}</div>
                            <div className="sr-ex-detail">{ex.sets} × {ex.reps} · {ex.rest}s rest</div>
                        </div>
                    </div>
                ))}
            </div>
            {!routine?.is_completed && (
                <button className="sr-complete-btn" onClick={completeRoutine} disabled={completing}>
                    <CheckCircle size={18} /> {completing ? 'Completando...' : 'Marcar como Completado'}
                </button>
            )}
            <button className="sr-refresh" onClick={loadRoutine}><RotateCw size={14} /> Nueva rutina</button>
        </div>
    )
}
