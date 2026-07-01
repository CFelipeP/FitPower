import { MonitorPlay, Brain, Utensils, BarChart3, Users, Smartphone, ArrowRight } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { useI18n } from '../../context/I18nContext'
import './Features.css'

const featureIcons = [MonitorPlay, Brain, Utensils, BarChart3, Users, Smartphone]

export default function Features() {
    const { t } = useI18n()
    const sectionRef = useScrollReveal()

    return (
        <section id="features" className="section" ref={sectionRef}>
            <div className="features-glow"></div>
            <div className="container features-content">
                <div className="text-center reveal section-intro">
                    <div className="section-header center">
                        <div className="section-header-line"></div>
                        <span className="section-header-label">{t('features.label')}</span>
                        <div className="section-header-line"></div>
                    </div>
                    <h2 className="section-title" style={{ marginBottom: '24px' }}>{t('features.title')}</h2>
                    <p className="features-subtitle">{t('features.subtitle')}</p>
                </div>

                <div className="features-grid">
                    {t('features.items').map((f, i) => {
                        const Icon = featureIcons[i] || MonitorPlay
                        return (
                        <div key={i} className="card-hover reveal feature-card" style={{ transitionDelay: `${i * 0.05}s` }}>
                            <div className="card-icon">
                                <Icon size={24} />
                            </div>
                            <h3 className="feature-title">{f.title}</h3>
                            <p className="feature-desc">{f.desc}</p>
                            <div className="card-arrow">
                                Explore <ArrowRight size={16} />
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        </section>
    )
}