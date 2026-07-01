import { Flame, Timer, Check } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { useI18n } from '../../context/I18nContext'
import './Experience.css'

const checks = [
    { title: 'Multi-Angle 4K Streaming', desc: 'Switch camera views mid-set to inspect form and execution mechanics.' },
    { title: 'Immersive Audio Engine', desc: 'Beat-synced background tracks with real-time rep counting from your coach.' },
    { title: 'Chromecast & AirPlay', desc: 'Cast any session to your TV or external monitor with a single tap.' },
]

export default function Experience() {
    const { t } = useI18n()
    const sectionRef = useScrollReveal()

    return (
        <section className="section" ref={sectionRef}>
            <div className="container">
                <div className="exp-grid">
                    <div className="exp-img-wrapper reveal-left">
                        <div className="exp-img-container">
                            <img loading="lazy" src="https://noorsportsandfitness.com/wp-content/uploads/2024/10/How-many-people-in-India-go-to-Gym-1024x683.webp" alt="FitPower Training Session" />
                            <div className="exp-img-overlay"></div>
                            <div className="exp-stats-card nav-blur">
                                <div className="exp-stat">
                                    <div className="exp-stat-icon"><Flame size={20} className="text-power" /></div>
                                    <div>
                                        <div className="exp-stat-val">847 kcal</div>
                                        <div className="exp-stat-label">Burned today</div>
                                    </div>
                                </div>
                                <div className="exp-stat">
                                    <div className="exp-stat-icon"><Timer size={20} className="text-power" /></div>
                                    <div>
                                        <div className="exp-stat-val">52 min</div>
                                        <div className="exp-stat-label">Total time</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="exp-decor"></div>
                    </div>

                    <div className="exp-text reveal-right">
                        <div className="section-header">
                            <div className="section-header-line"></div>
                            <span className="section-header-label">Experience</span>
                        </div>
                        <h2 className="exp-title">{t('experience.title')}</h2>
                        <p className="exp-desc">{t('experience.subtitle')}</p>

                        <div className="exp-checks">
                            {checks.map((c, i) => (
                                <div key={i} className="exp-check-item">
                                    <div className="exp-check-icon"><Check size={16} className="text-power" /></div>
                                    <div>
                                        <h4 className="exp-check-title">{c.title}</h4>
                                        <p className="exp-check-desc">{c.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}