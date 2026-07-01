import { Zap } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { useI18n } from '../../context/I18nContext'
import './CTA.css'

export default function CTA() {
    const { t } = useI18n()
    const sectionRef = useScrollReveal()
    return (
        <section className="cta-section" ref={sectionRef}>
            <div className="cta-bg-img"></div>
            <div className="cta-overlay"></div>
            <div className="cta-glow"></div>
            <div className="cta-line-top"></div>
            <div className="cta-line-bottom"></div>

            <div className="container cta-content reveal">
                <div className="cta-badge">
                    <Zap size={12} className="text-power" />
                    <span>7-day free trial</span>
                </div>
                <h2 className="cta-title">{t('cta.title')}</h2>
                <p className="cta-desc">{t('cta.subtitle')}</p>
                <a href="#pricing" className="btn-primary btn-shine glow-yellow-strong cta-btn">{t('cta.button')}</a>
            </div>
        </section>
    )
}