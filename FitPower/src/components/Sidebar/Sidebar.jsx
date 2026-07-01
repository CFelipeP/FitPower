import { Link } from 'react-router-dom'
import { Zap, ChevronRight, Menu, X, PanelLeft } from 'lucide-react'
import './Sidebar.css'

export default function Sidebar({ items, activeNav, onNavClick, userName, userSubtitle, avatarUrl, role, collapsed, onToggle, mobileOpen, onMobileClose }) {
    function isSection(obj) {
        return obj.section || obj.type === 'heading'
    }

    function getSectionLabel(obj) {
        return obj.section || obj.label || ''
    }

    const handleMobileClose = onMobileClose || onToggle

    const pageTitle = activeNav || 'Dashboard'

    return (
        <>
            <header className="sb-mobile-header">
                <button className="sb-mobile-toggle" onClick={onToggle} aria-label="Open menu">
                    <Menu size={22} />
                </button>
                <span className="sb-mobile-title">{pageTitle}</span>
                <div style={{ width: 38 }} />
            </header>

            {mobileOpen && <div className="sb-overlay" onClick={handleMobileClose} />}

            <aside className={`sb-sidebar ${collapsed ? 'sb-collapsed' : ''} ${mobileOpen ? 'sb-mobile-open' : ''}`}>
                <div className="sb-header">
                    <button className="sb-expand-btn" onClick={onToggle} aria-label="Expand sidebar">
                        <PanelLeft size={20} />
                    </button>
                    <Link to="/" className="sb-logo">
                        <div className="sb-logo-icon"><Zap className="sb-logo-svg" /></div>
                        <span className="sb-logo-text">Fit<span>Power</span></span>
                    </Link>
                    <button className="sb-collapse-btn" onClick={onToggle} aria-label="Close sidebar">
                        <X size={18} />
                    </button>
                </div>

                <nav className="sb-nav">
                    {items.map((item, i) => {
                        if (isSection(item)) {
                            return (
                                <div key={i} className="sb-section-label">
                                    {getSectionLabel(item)}
                                </div>
                            )
                        }
                        const Icon = item.icon
                        const isActive = activeNav === item.label
                        return (
                            <button
                                key={item.label + '-' + i}
                                className={`sb-nav-item ${isActive ? 'sb-active' : ''} ${collapsed ? 'sb-item-collapsed' : ''}`}
                                onClick={() => { onNavClick(item.label); if (mobileOpen) handleMobileClose() }}
                                title={collapsed ? item.label : undefined}
                            >
                                {Icon && <Icon className="sb-nav-icon" />}
                                <span className="sb-nav-label">{item.label}</span>
                                {!collapsed && item.badge != null && (
                                    <span className="sb-nav-badge">{item.badge}</span>
                                )}
                            </button>
                        )
                    })}
                </nav>

                <div className="sb-footer">
                    <button
                        className="sb-profile"
                        onClick={(e) => {
                            e.preventDefault()
                            onNavClick('Profile')
                            if (mobileOpen) handleMobileClose()
                        }}
                    >
                        <img loading="lazy"
                            src={avatarUrl || `https://picsum.photos/seed/${role || 'user'}/80/80.jpg`}
                            alt="Profile"
                            className="sb-avatar"
                        />
                        {!collapsed && (
                            <div className="sb-user-info">
                                <div className="sb-user-name">{userName || 'User'}</div>
                                <div className="sb-user-role">{userSubtitle || ''}</div>
                            </div>
                        )}
                        {!collapsed && <ChevronRight className="sb-chevron" />}
                    </button>
                </div>
            </aside>
        </>
    )
}
