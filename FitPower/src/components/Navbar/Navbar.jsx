import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Zap, Menu, X, ChevronDown, LogOut, LayoutDashboard, Users, Dumbbell, CalendarDays, MessageCircle, BarChart3, Utensils, Target, Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/I18nContext'
import './Navbar.css'

const DASHBOARD_ROUTES = ['/admin/dashboard', '/coach/dashboard', '/client/dashboard', '/onboarding', '/checkout']

const roleNavLinks = {
    admin: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/admin/dashboard' },
        { label: 'Users', icon: Users, to: '/admin/dashboard' },
        { label: 'Programs', icon: Dumbbell, to: '/admin/dashboard' },
        { label: 'Analytics', icon: BarChart3, to: '/admin/dashboard' },
    ],
    coach: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/coach/dashboard' },
        { label: 'Clients', icon: Users, to: '/coach/dashboard' },
        { label: 'Schedule', icon: CalendarDays, to: '/coach/dashboard' },
        { label: 'Messages', icon: MessageCircle, to: '/coach/dashboard' },
    ],
    client: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/client/dashboard' },
        { label: 'Workouts', icon: Dumbbell, to: '/client/dashboard' },
        { label: 'Nutrition', icon: Utensils, to: '/client/dashboard' },
        { label: 'Progress', icon: Target, to: '/client/dashboard' },
    ],
}

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)
    const { isAuthenticated, role, logout: authLogout } = useAuth()
    const { t } = useI18n()
    const location = useLocation()
    const navigate = useNavigate()

    const isDashboardRoute = DASHBOARD_ROUTES.includes(location.pathname)
    const isLoggedIn = isAuthenticated
    const currentRole = isLoggedIn && role ? role : null
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 80)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const isAuthPage = ['/login', '/register', '/register/trainer'].includes(location.pathname)
    if (isAuthPage) return null

    const handleLinkClick = () => setMenuOpen(false)

    const handleLogout = () => {
        authLogout()
        navigate('/')
    }

    const dashboardPath = currentRole ? '/' + currentRole + '/dashboard' : null
    const links = currentRole ? roleNavLinks[currentRole] || [] : []

    if (isDashboardRoute) return null

    // No navbar while a user session is active — except on the public homepage.
    if (isAuthenticated && location.pathname !== '/') return null

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="navbar-container container">
                <a href="/" className="logo">
                    <div className="logo-icon">
                        <Zap size={20} color="#000" />
                    </div>
                    <span className="logo-text">Fit<span className="text-power">Power</span></span>
                </a>

                {currentRole ? (
                    <div className="nav-links">
                        {links.map(link => (
                            <Link key={link.label} to={link.to} className="nav-role-link">{t(`nav.${link.label.toLowerCase()}`)}</Link>
                        ))}
                        <Link to="/coaches">{t('nav.coaches')}</Link>
                        <Link to="/forum">{t('nav.community')}</Link>
                        <Link to="/blog">{t('nav.blog')}</Link>
                    </div>
                ) : (
                    <div className="nav-links">
                        <a href="/#programs">{t('nav.programs')}</a>
                        <a href="/#features">{t('nav.features')}</a>
                        <a href="/#pricing">{t('nav.pricing')}</a>
                        <a href="/#contact">{t('nav.contact')}</a>
                        <Link to="/coaches">{t('nav.coaches')}</Link>
                        <Link to="/blog">{t('nav.blog')}</Link>
                        <Link to="/forum">{t('nav.community')}</Link>
                    </div>
                )}

                <div className="nav-actions">
                    {isLoggedIn ? (
                        <div className="nav-dropdown" ref={dropdownRef}>
                            <button
                                className="btn-nav-desktop btn-shine"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                <LayoutDashboard size={16} /> {t('nav.dashboard')} <ChevronDown size={14} className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`} />
                            </button>
                            <div className={`dropdown-menu ${dropdownOpen ? 'open' : ''}`}>
                                <Link to={dashboardPath} className="dropdown-item" onClick={() => { setDropdownOpen(false); handleLinkClick() }}>
                                    <span className="dropdown-item-title">{t('nav.goToDashboard')}</span>
                                    <span className="dropdown-item-desc">{role === 'admin' ? t('nav.adminPanel') : role === 'coach' ? t('nav.coachPanel') : t('nav.myProgress')}</span>
                                </Link>
                                <Link to="/settings" className="dropdown-item" onClick={() => { setDropdownOpen(false); handleLinkClick() }}>
                                    <span className="dropdown-item-title"><Settings size={14} style={{ display: 'inline', marginRight: 6 }} /> {t('nav.settings')}</span>
                                    <span className="dropdown-item-desc">{t('nav.settingsLabel')}</span>
                                </Link>
                                <button className="dropdown-item" onClick={() => { handleLogout(); setDropdownOpen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
                                    <span className="dropdown-item-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LogOut size={14} /> {t('nav.logout')}</span>
                                    <span className="dropdown-item-desc">{t('nav.signOut')}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="nav-dropdown" ref={dropdownRef}>
                            <button
                                className="btn-nav-desktop btn-shine"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                {t('nav.getStarted')} <ChevronDown size={14} className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`} />
                            </button>
                            <div className={`dropdown-menu ${dropdownOpen ? 'open' : ''}`}>
                                <Link to="/register" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                                    <span className="dropdown-item-title">{t('nav.register')}</span>
                                    <span className="dropdown-item-desc">{t('nav.createAccount')}</span>
                                </Link>
                                <Link to="/login" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                                    <span className="dropdown-item-title">{t('nav.login')}</span>
                                    <span className="dropdown-item-desc">{t('nav.welcomeBack')}</span>
                                </Link>
                            </div>
                        </div>
                    )}
                    <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
                        {menuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
                {currentRole ? (
                    <>
                        {links.map(link => (
                            <Link key={link.label} to={link.to} className="mobile-link" onClick={handleLinkClick}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><link.icon size={16} /> {t(`nav.${link.label.toLowerCase()}`)}</span>
                            </Link>
                        ))}
                        <div className="mobile-divider"></div>
                        <Link to="/coaches" className="mobile-link" onClick={handleLinkClick}>{t('nav.coaches')}</Link>
                        <Link to="/forum" className="mobile-link" onClick={handleLinkClick}>{t('nav.community')}</Link>
                        <Link to="/blog" className="mobile-link" onClick={handleLinkClick}>{t('nav.blog')}</Link>
                    </>
                ) : (
                    <>
                        <a href="/#programs" className="mobile-link" onClick={handleLinkClick}>{t('nav.programs')}</a>
                        <a href="/#features" className="mobile-link" onClick={handleLinkClick}>{t('nav.features')}</a>
                        <a href="/#pricing" className="mobile-link" onClick={handleLinkClick}>{t('nav.pricing')}</a>
                        <a href="/#contact" className="mobile-link" onClick={handleLinkClick}>{t('nav.contact')}</a>
                        <Link to="/coaches" className="mobile-link" onClick={handleLinkClick}>{t('nav.coaches')}</Link>
                        <Link to="/blog" className="mobile-link" onClick={handleLinkClick}>{t('nav.blog')}</Link>
                        <Link to="/forum" className="mobile-link" onClick={handleLinkClick}>{t('nav.community')}</Link>
                    </>
                )}

                {currentRole ? (
                    <>
                        <Link to={dashboardPath} className="mobile-link" style={{ color: 'var(--power-500)', fontWeight: 600 }} onClick={handleLinkClick}>
                            <LayoutDashboard size={16} style={{ display: 'inline', marginRight: 8 }} /> {t('nav.dashboard')}
                        </Link>
                        <Link to="/settings" className="mobile-link" onClick={handleLinkClick}>
                            <Settings size={16} style={{ display: 'inline', marginRight: 8 }} /> {t('nav.settings')}
                        </Link>
                        <button className="mobile-link" onClick={() => { handleLogout(); handleLinkClick() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left', padding: '8px 0', color: '#ef4444' }}>
                            <LogOut size={16} style={{ display: 'inline', marginRight: 8 }} /> {t('nav.logout')}
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="mobile-link" onClick={handleLinkClick}>{t('nav.login')}</Link>
                        <Link to="/register" className="mobile-link btn-mobile-cta btn-shine" onClick={handleLinkClick}>{t('nav.register')}</Link>
                    </>
                )}
            </div>
        </nav>
    )
}
