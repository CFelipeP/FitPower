import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { useI18n } from '../../context/I18nContext'
import { apiFetch } from '../../lib/api'
import './Testimonials.css'

const fallbackTestimonials = [
    { img: 'https://picsum.photos/seed/user-maria/80/80.jpg', name: 'María González', sub: 'Lost 12kg in 3 months', text: '"Dropped 12kg in 3 months and built a level of confidence I hadn\'t had in years. The live coaching sessions are a game-changer."' },
    { img: 'https://picsum.photos/seed/user-carlos/80/80.jpg', name: 'Carlos Mendoza', sub: 'Certified Strength Coach', text: '"As a coach, I recommend FitPower to all my clients. The programming quality and the AI auto-regulation are next-level."' },
    { img: 'https://picsum.photos/seed/user-laura/80/80.jpg', name: 'Laura Fernández', sub: 'Mom of 2, 8+ months active', text: '"Two kids, no gym within 30 miles. FitPower lets me train at 5am or 11pm. My health metrics have completely transformed."' },
]

export default function Testimonials() {
    const { t } = useI18n()
    const sectionRef = useScrollReveal()
    const [testimonials, setTestimonials] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        apiFetch('/leaderboard?period=total&limit=6')
            .then(res => {
                if (res?.entries?.length) {
                    setTestimonials(res.entries.map(e => ({
                        name: e.user_name || e.name,
                        sub: `${e.points} points`,
                        text: `"${e.achievement || 'FitPower has completely transformed my training.'}"`,
                        img: e.avatar || `https://picsum.photos/seed/user-${e.user_id}/80/80.jpg`,
                    })))
                } else {
                    setTestimonials(fallbackTestimonials)
                }
            })
            .catch(() => setTestimonials(fallbackTestimonials))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return null

    const items = testimonials.length ? testimonials : fallbackTestimonials

    return (
        <section id="testimonials" className="section" ref={sectionRef}>
            <div className="container">
                <div className="text-center reveal section-intro">
                    <div className="section-header center">
                        <div className="section-header-line"></div>
                        <span className="section-header-label">{t('testimonials.label')}</span>
                        <div className="section-header-line"></div>
                    </div>
                    <h2 className="section-title">{t('testimonials.title')}</h2>
                </div>
                <div className="test-grid">
                    {items.map((item, i) => (
                        <div key={i} className="testimonial-card reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                            <div className="stars">
                                {[...Array(5)].map((_, j) => <Star key={j} size={16} className="star-icon" fill="var(--power-500)" />)}
                            </div>
                            <p className="test-text">{item.text || item.comment}</p>
                            <div className="test-author">
                                <img loading="lazy" src={item.img || item.avatar || `https://picsum.photos/seed/user-${i}/80/80.jpg`} alt={item.name || item.user_name} className="test-img" />
                                <div>
                                    <div className="test-name">{item.name || item.user_name}</div>
                                    <div className="test-sub">{item.sub || item.achievement || ''}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}