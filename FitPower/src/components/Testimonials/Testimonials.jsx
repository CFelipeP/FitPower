import { useState, useEffect, useRef, useCallback } from 'react'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '../../context/I18nContext'
import { apiFetch } from '../../lib/api'
import './Testimonials.css'

export default function Testimonials() {
    const { t } = useI18n()
    const sectionRef = useRef(null)
    const [testimonials, setTestimonials] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        apiFetch('/public/testimonials')
            .then(data => {
                if (data?.testimonials?.length) {
                    setTestimonials(data.testimonials)
                } else {
                    setTestimonials([])
                }
            })
            .catch(() => setTestimonials([]))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (loading || !sectionRef.current) return
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active')
                    }
                })
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        )
        const elements = sectionRef.current.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale')
        elements.forEach((el) => observer.observe(el))
        return () => observer.disconnect()
    }, [loading])

    const totalSlides = Math.ceil(testimonials.length / 3)

    const goTo = useCallback((index) => {
        setCurrentIndex(Math.max(0, Math.min(index, totalSlides - 1)))
    }, [totalSlides])

    useEffect(() => {
        if (totalSlides <= 1) return
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % totalSlides)
        }, 6000)
        return () => clearInterval(timer)
    }, [totalSlides])

    if (loading || !testimonials.length) return null

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
                <div className="test-carousel-wrap reveal">
                    {totalSlides > 1 && (
                        <button className="test-carousel-btn test-prev" onClick={() => goTo(currentIndex - 1)} aria-label="Previous">
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div className="test-carousel-viewport">
                        <div className="test-carousel-track" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                            {Array.from({ length: totalSlides }).map((_, slideIdx) => (
                                <div key={slideIdx} className="test-carousel-slide">
                                    {testimonials.slice(slideIdx * 3, slideIdx * 3 + 3).map((item, i) => (
                                        <div key={i} className="testimonial-card">
                                            <div className="stars">
                                                {[...Array(5)].map((_, j) => (
                                                    <Star key={j} size={16} className="star-icon" fill={j < item.rating ? 'var(--power-500)' : 'none'} color={j < item.rating ? 'var(--power-500)' : 'var(--border)'} />
                                                ))}
                                            </div>
                                            <p className="test-text">{item.comment}</p>
                                            <div className="test-author">
                                                <div className="test-img-wrap">
                                                    {item.userPhoto ? (
                                                        <img loading="lazy" src={item.userPhoto} alt={item.userName} className="test-img" />
                                                    ) : (
                                                        <div className="test-img-placeholder">{item.userName?.[0] || 'U'}</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="test-name">{item.userName}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    {totalSlides > 1 && (
                        <button className="test-carousel-btn test-next" onClick={() => goTo(currentIndex + 1)} aria-label="Next">
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>
                {totalSlides > 1 && (
                    <div className="test-dots reveal">
                        {Array.from({ length: totalSlides }).map((_, i) => (
                            <button key={i} className={`test-dot ${i === currentIndex ? 'active' : ''}`} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
