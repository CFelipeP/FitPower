import { useState, useEffect, useRef } from 'react'
import { ArrowRight, Loader2, Check } from 'lucide-react'
import { useI18n } from '../../context/I18nContext'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import './Programs.css'

export default function Programs() {
    const [programs, setPrograms] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [enrolling, setEnrolling] = useState(null)
    const [enrolledIds, setEnrolledIds] = useState(new Set())
    const sectionRef = useRef(null)
    const { t } = useI18n()
    const { showToast } = useToast()

    const handleEnroll = async (programId) => {
        setEnrolling(programId)
        try {
            await apiFetch('/enrollments', {
                method: 'POST',
                body: JSON.stringify({ program_id: programId })
            })
            setEnrolledIds(prev => new Set(prev).add(programId))
            showToast('Successfully enrolled!')
        } catch {
            showToast('Error enrolling in program')
        } finally {
            setEnrolling(null)
        }
    }

    useEffect(() => {
        if (!loading && sectionRef.current) {
            const els = sectionRef.current.querySelectorAll('.reveal, .reveal-scale')
            els.forEach(el => el.classList.add('active'))
        }
    }, [loading])

    useEffect(() => {
        let cancelled = false
        apiFetch('/programs?perPage=3')
            .then(data => { if (!cancelled) setPrograms(data?.programs || []) })
            .catch(err => { if (!cancelled) setError(err.message) })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [])

    return (
        <section id="programs" className="section" ref={sectionRef}>
            <div className="container">
                <div className="programs-header">
                    <div className="reveal">
                        <div className="section-header">
                            <div className="section-header-line"></div>
                            <span className="section-header-label">{t('programs.label')}</span>
                        </div>
                        <h2 className="section-title" dangerouslySetInnerHTML={{ __html: t('programs.title') }} />
                    </div>
                    <p className="reveal programs-subtitle" style={{ transitionDelay: '0.1s' }}>
                        {t('programs.subtitle')}
                    </p>
                </div>

                {loading ? (
                    <div className="programs-loading">
                        <Loader2 size={24} className="spin" />
                        <span>{t('common.loading')}</span>
                    </div>
                ) : error ? (
                    <div className="programs-error">
                        <p>{t('common.error')}</p>
                    </div>
                ) : (
                    <div className="programs-grid">
                        {programs.map((p, i) => (
                            <div key={p.id} className="program-card reveal-scale" style={{ transitionDelay: `${i * 0.1}s` }}>
                                <div className="program-img-wrapper">
                                    <img loading="lazy" src={p.image || 'https://picsum.photos/seed/fitpower-program/600/450.jpg'} alt={p.name} className="program-img" />
                                    <div className="program-overlay"></div>
                                </div>
                                <div className="program-content">
                                    <div className="program-meta">
                                        <span className="program-tag">{p.tag || p.difficulty}</span>
                                        <span className="program-time">{p.durationMinutes ? `${p.durationMinutes}${isNaN(p.durationMinutes) ? '' : ' min'}` : ''}</span>
                                    </div>
                                    <h3 className="program-title">{p.name}</h3>
                                    <p className="program-desc">{p.description}</p>
                                    <button
                                        className={'programs-link enroll-btn' + (enrolledIds.has(p.id) ? ' enrolled' : '')}
                                        style={{marginTop:12,display:'inline-flex',alignItems:'center',gap:6,border:'none',background:'none',cursor: enrolledIds.has(p.id) ? 'default' : 'pointer',fontSize:14,fontWeight:600,color: enrolledIds.has(p.id) ? 'var(--power-500)' : 'inherit'}}
                                        onClick={(e) => { e.stopPropagation(); if (!enrolledIds.has(p.id)) handleEnroll(p.id) }}
                                        disabled={enrolling === p.id}
                                    >
                                        {enrolling === p.id ? (
                                            <><Loader2 size={14} className="spin" /> Enrolling...</>
                                        ) : enrolledIds.has(p.id) ? (
                                            <><Check size={14} /> Enrolled</>
                                        ) : (
                                            'Enroll Now →'
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="reveal programs-cta">
                    <a href={window.isAuthenticated ? '/coach/dashboard' : '/register'} className="programs-link">
                        {t('programs.viewAll')} <ArrowRight size={16} />
                    </a>
                </div>
            </div>
        </section>
    )
}
