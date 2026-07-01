import { Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../context/I18nContext'
import './Footer.css'

// Íconos SVG personalizados para redes sociales (Estilo Lucide)
const InstagramIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
)

const TwitterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
)

const YoutubeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" /><path d="m10 15 5-3-5-3z" />
    </svg>
)

const LinkedinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" />
    </svg>
)

const socialIcons = [InstagramIcon, TwitterIcon, YoutubeIcon, LinkedinIcon]

const links = {
    Product: ['Programs', 'Live Coaching', 'Coaches', 'Nutrition'],
    Company: ['About Us', 'Blog', 'Careers', 'Press'],
    Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Refund Policy'],
    Support: ['FAQ'],
}

const linkKeys = {
    Product: 'footer.product',
    Company: 'footer.company',
    Legal: 'footer.legal',
    Support: 'footer.support',
}

const linkItems = {
    'Privacy Policy': 'footer.privacy',
    'Terms of Service': 'footer.terms',
    FAQ: 'footer.faq',
}

export default function Footer() {
    const { t } = useI18n()
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <Link to="/" className="logo">
                            <div className="logo-icon"><Zap size={20} color="#000" /></div>
                            <span className="logo-text">Fit<span className="text-power">Power</span></span>
                        </Link>
                        <p className="footer-desc">{t('footer.tagline')}</p>
                        <div className="footer-socials">
                            {socialIcons.map((Icon, i) => {
                                const urls = ['https://instagram.com/fitpower','https://twitter.com/fitpower','https://youtube.com/@fitpower','https://linkedin.com/company/fitpower']
                                return <a key={i} href={urls[i]} target="_blank" rel="noopener noreferrer" className="social-link"><Icon /></a>
                            })}
                        </div>
                    </div>

                    {Object.entries(links).map(([title, items]) => {
                        const routeMap = {
                            Programs:'/#programs', Blog:'/blog', FAQ:'/contact',
                            'About Us':'/','Careers':'/','Press':'/',
                            'Live Coaching':'/','Coaches':'/','Nutrition':'/',
                            'Privacy Policy':'/contact','Terms of Service':'/contact',
                            'Cookie Policy':'/contact','Refund Policy':'/contact',
                        }
                        return (
                        <div key={title}>
                            <h4 className="footer-title">{t(linkKeys[title])}</h4>
                            <ul className="footer-list">
                                {items.map((item, i) => {
                                    const to = routeMap[item] || '/'
                                    const isHash = to.startsWith('#')
                                    return (
                                    <li key={i}>
                                        {isHash ? <a href={to}>{linkItems[item] ? t(linkItems[item]) : item}</a>
                                         : <Link to={to}>{linkItems[item] ? t(linkItems[item]) : item}</Link>}
                                    </li>
                                )})}
                            </ul>
                        </div>
                    )})}
                </div>

                <div className="footer-bottom">
                    <p>© {new Date().getFullYear()} FitPower. {t('footer.rights')}</p>
                    <p>{t('footer.tagline')}</p>
                </div>
            </div>
        </footer>
    )
}