import { Link } from 'react-router-dom'
import { Zap, ChevronRight, Menu, X, PanelLeft } from 'lucide-react'
import './Sidebar.css'

export default function Sidebar({ items, activeNav, onNavClick, userName, userSubtitle, avatarUrl, collapsed, onToggle, mobileOpen, onMobileClose, mobileRight }) {
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
                <div className="sb-mobile-right">
                    {mobileRight || <span className="sb-mobile-right-spacer" />}
                </div>
            </header>

            {mobileOpen && <div className="sb-overlay" onClick={handleMobileClose} />}

            <nav className={`sb-sidebar ${collapsed ? 'sb-collapsed' : ''} ${mobileOpen ? 'sb-mobile-open' : ''}`} aria-label="Main navigation">
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

                <div className="sb-nav">
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
                                type="button"
                                className={`sb-nav-item ${isActive ? 'sb-active' : ''} ${collapsed ? 'sb-item-collapsed' : ''}`}
                                onClick={() => { onNavClick(item.label); if (mobileOpen) handleMobileClose() }}
                                title={collapsed ? item.label : undefined}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {Icon && <Icon className="sb-nav-icon" aria-hidden="true" />}
                                <span className="sb-nav-label">{item.label}</span>
                                {!collapsed && item.badge != null && (
                                    <span className="sb-nav-badge">{item.badge}</span>
                                )}
                            </button>
                        )
                    })}
                </div>

                <div className="sb-footer">
                    <button
                        type="button"
                        className="sb-profile"
                        onClick={(e) => {
                            e.preventDefault()
                            onNavClick('Profile')
                            if (mobileOpen) handleMobileClose()
                        }}
                    >
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt=""
                                className="sb-avatar"
                            />
                        ) : (
                            <div className="sb-avatar sb-avatar-initials" aria-hidden="true">
                                {(userName || 'U').trim().charAt(0).toUpperCase()}
                            </div>
                        )}
                        {!collapsed && (
                            <div className="sb-user-info">
                                <div className="sb-user-name">{userName || 'User'}</div>
                                <div className="sb-user-role">{userSubtitle || ''}</div>
                            </div>
                        )}
                        {!collapsed && <ChevronRight className="sb-chevron" aria-hidden="true" />}
                    </button>
                </div>
            </nav>
        </>
    )
}
