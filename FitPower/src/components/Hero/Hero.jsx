import { PlayCircle, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { useCarousel } from '../../hooks/useCarousel'
import { useCounter } from '../../hooks/useCounter'
import { useI18n } from '../../context/I18nContext'
import './Hero.css'

const slides = [
    { img: 'https://cdn.prod.website-files.com/61f6a1f670934ed39d548853/64aa5cc15b2a0b30415ce2dc_The%20Weightlifters.webp', tag: 'Strength', title: 'Power Lifting Pro', desc: '45-60 min sessions' },
    { img: 'https://lifehacker.com/imagery/articles/01HF2GQBNWVY9PNNCPKWPM38XC/hero-image.fill.size_1248x702.v1699833312.jpg', tag: 'Cardio', title: 'HIIT Inferno', desc: '25-40 min sessions' },
    { img: 'https://nutritionsource.hsph.harvard.edu/wp-content/uploads/2021/11/pexels-yan-krukov-8436601-copy-1024x768.jpg', tag: 'Mobility', title: 'Flow Yoga', desc: '30-50 min sessions' },
    { img: 'https://www.strongfitnessmag.com/wp-content/uploads/2021/12/Boxing-GirlsJustwannabox.jpg', tag: 'Combat', title: 'Boxing Fit', desc: '30-45 min sessions' },
]

function CounterItem({ target, suffix, label }) {
    const { formatCount, ref } = useCounter(target, suffix === '%')
    const parts = label.split('<br/>')
    return (
        <div>
            <div className={`counter-value ${suffix === '%' ? 'text-power' : ''}`} ref={ref}>{formatCount()}</div>
            <div className="counter-label">{parts.map((p, i) => i < parts.length - 1 ? <span key={i}>{p}<br /></span> : <span key={i}>{p}</span>)}</div>
        </div>
    )
}

export default function Hero() {
    const { t } = useI18n()
    const { currentSlide, progress, nextSlide, prevSlide, goToSlide, pause, resume, handleTouchStart, handleTouchEnd } = useCarousel(slides.length)

    return (
        <section className="hero">
            <div className="hero-bg">
                <div className="hero-glow-1 animate-pulse-glow"></div>
                <div className="hero-glow-2"></div>
                <div className="hero-ring-1 animate-rotate-slow"></div>
                <div className="hero-ring-2 animate-rotate-slow"></div>
            </div>

            <div className="container hero-content">
                <div className="hero-grid">

                    <div className="hero-text" style={{ animation: 'slide-up 1s ease 0.15s both' }}>
                        <div className="hero-badge" style={{ animation: 'slide-up 0.8s ease forwards' }}>
                            <span className="badge-dot"></span>
                            <span className="badge-text">#1 Online Fitness Platform In El Salvador</span>
                        </div>

                        <h1 className="hero-title" style={{ animation: 'slide-up 1s ease 0.15s both' }}>
                            {t('hero.title')}
                        </h1>

                        <p className="hero-desc" style={{ animation: 'slide-up 1s ease 0.3s both' }}>
                            {t('hero.subtitle')}
                        </p>

                        <div className="hero-buttons" style={{ animation: 'slide-up 1s ease 0.45s both' }}>
                            <a href="#pricing" className="btn-primary btn-shine glow-yellow-strong">{t('hero.cta')}</a>
                            <a href="#programs" className="btn-secondary">
                                <PlayCircle size={20} className="text-power" />
                                {t('hero.secondary')}
                            </a>
                        </div>

                        <div className="hero-counters" style={{ animation: 'slide-up 1s ease 0.6s both' }}>
                            <CounterItem target={15000} suffix="+" label="Active<br/>Users" />
                            <CounterItem target={500} suffix="+" label="Workout<br/>Routines" />
                            <CounterItem target={50} suffix="+" label="Certified<br/>Coaches" />
                            <CounterItem target={98} suffix="%" label="% Satis-<br/>faction" />
                        </div>
                    </div>

                    <div className="hero-carousel-wrapper" style={{ animation: 'slide-up 1s ease 0.3s both' }}>
                        <div className="carousel-viewport glow-yellow"
                            onMouseEnter={pause}
                            onMouseLeave={resume}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            <div className="carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                                {slides.map((slide, i) => (
                                    <div key={i} className="carousel-slide">
                                        <img loading="lazy" src={slide.img} alt={slide.title} />
                                        <div className="carousel-caption">
                                            <span className="carousel-tag">{slide.tag}</span>
                                            <h3 className="carousel-title">{slide.title}</h3>
                                            <p className="carousel-desc">{slide.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="carousel-arrow left" onClick={prevSlide} aria-label="Previous slide"><ChevronLeft size={20} /></button>
                            <button className="carousel-arrow right" onClick={nextSlide} aria-label="Next slide"><ChevronRight size={20} /></button>
                            <div className="carousel-progress" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="carousel-dots">
                            {slides.map((_, i) => (
                                <button key={i} className={`carousel-dot ${i === currentSlide ? 'active' : ''}`} onClick={() => goToSlide(i)} aria-label={`Slide ${i + 1}`}></button>
                            ))}
                        </div>
                        <div className="carousel-decor-1"></div>
                        <div className="carousel-decor-2"></div>
                    </div>

                </div>
            </div>

            <div className="hero-scroll-indicator animate-float" style={{ animationDuration: '3s' }}>
                <span>Scroll</span>
                <ChevronDown size={16} />
            </div>
        </section>
    )
}