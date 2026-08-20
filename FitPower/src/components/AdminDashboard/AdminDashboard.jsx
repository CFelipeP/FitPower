import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../Avatar/Avatar'
import { apiFetch } from '../../lib/api'
import { confirmSwal, swalError, swalSelect, swalSuccess } from '../../lib/alerts'
import { mediaUrl } from '../../lib/media'
import { exportToCSV } from '../../lib/export'
import { Counter } from '../Counter'
import {
    X, Zap, LayoutDashboard, Users, Dumbbell,
    CreditCard, BarChart3, Video, FileText, Image as ImageIcon,
    MessageCircle, AlertTriangle, Settings, Shield,
    Search, Bell, ChevronDown, AlertCircle, Trash2,
    UserPlus, Download, DollarSign, TrendingUp, ArrowRight,
    Flame, Heart, Target, Ban, LogOut, User,
    Activity, Award, Star, Ticket, BookOpen,
    Mail, Hash, Megaphone, Utensils, Upload, Wallet
} from 'lucide-react'
import '../ClientDashboard/ClientDashboard.css'
import ProfileEditModal from '../ProfileModal/ProfileEditModal'
import NotificationsDropdown from '../NotificationsDropdown/NotificationsDropdown'
import ProgramsManager from '../ProgramsManager/ProgramsManager'
import Sidebar from '../Sidebar/Sidebar'
import { DashboardSkeleton } from '../LoadingSkeleton/LoadingSkeleton'
import AdminUsers from './AdminUsers'
import AdminCoaches from './AdminCoaches'
import AdminSubscriptions from './AdminSubscriptions'
import AdminPayments from './AdminPayments'
import AdminPlans from './AdminPlans'
import AdminCoupons from './AdminCoupons'
import AdminTickets from './AdminTickets'
import AdminBlog from './AdminBlog'
import AdminMessages from './AdminMessages'
import AdminExercises from './AdminExercises'
import AdminChallenges from './AdminChallenges'
import AdminAnalytics from './AdminAnalytics'
import AdminForum from './AdminForum'
import AdminNotifications from './AdminNotifications'
import AdminRecipes from './AdminRecipes'
import VideoLibrary from '../VideoLibrary/VideoLibrary'
import SettingsPanel from '../Settings/Settings'
import './AdminDashboard.css'

const navItems = [
    { section: 'Overview' },
    { label: 'Dashboard', icon: LayoutDashboard, active: true },
    { label: 'User Management', icon: Users },
    { label: 'Coaches', icon: Award },
    { label: 'Programs', icon: Dumbbell },
    { label: 'Billing & Subs', icon: CreditCard },
    { label: 'Payments', icon: Wallet },
    { label: 'Plans', icon: Star },
    { label: 'Coupons', icon: Ticket },
    { label: 'Analytics', icon: BarChart3 },
    { section: 'Content' },
    { label: 'Video Library', icon: Video },
    { label: 'Blog', icon: BookOpen },
    { label: 'Exercises', icon: Dumbbell },
    { label: 'Challenges', icon: Flame },
    { label: 'Recipes', icon: Utensils },
    { label: 'Media Assets', icon: ImageIcon },
    { section: 'Support' },
    { label: 'Support Tickets', icon: MessageCircle },
    { label: 'Messages', icon: Mail },
    { label: 'Forum', icon: Hash },
    { label: 'Flagged Reports', icon: AlertTriangle },
    { section: 'System' },
    { label: 'Notifications', icon: Megaphone },
    { label: 'Configuration', icon: Settings },
    { label: 'Security & Audit', icon: Shield },
    { section: 'Account' },
    { label: 'Profile', icon: User },
    { label: 'Log Out', icon: LogOut },
]

export default function AdminDashboard() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const { logout: authLogout } = useAuth()
    const [notifOpen, setNotifOpen] = useState(false)
    const [profileModalOpen, setProfileModalOpen] = useState(false)
    const [profileForm, setProfileForm] = useState({
        firstName: '', lastName: '', email: '', photo: '',
        fitnessLevel: '', primaryGoal: '', trainingDays: ''
    })
    const [profileFormLoading, setProfileFormLoading] = useState(false)
    const [profileFormSaving, setProfileFormSaving] = useState(false)
    const [userPhoto, setUserPhoto] = useState('')
    const [userModalOpen, setUserModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [countersVisible, setCountersVisible] = useState(false)
    const [barAnimated, setBarAnimated] = useState(false)
    const [ringAnimated, setRingAnimated] = useState(false)
    const [data, setData] = useState(null)
    const [profileData, setProfileData] = useState(null)
    const [profileLoading, setProfileLoading] = useState(false)
    const [usersPage, setUsersPage] = useState(1)
    const [usersSearch, setUsersSearch] = useState('')
    const [activeNav, setActiveNav] = useState('Dashboard')
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
    const [replyModalOpen, setReplyModalOpen] = useState(false)
    const [replyTicketId, setReplyTicketId] = useState(null)
    const [replyMessage, setReplyMessage] = useState('')
    const [replySubmitting, setReplySubmitting] = useState(false)
    const [mediaAssets, setMediaAssets] = useState([])
    const [mediaAssetsLoading, setMediaAssetsLoading] = useState(false)
    const [flaggedReports, setFlaggedReports] = useState([])
    const [flaggedReportsLoading, setFlaggedReportsLoading] = useState(false)
    const [platformSettings, setPlatformSettings] = useState([])
    const [platformSettingsLoading, setPlatformSettingsLoading] = useState(false)
    const [settingsDraft, setSettingsDraft] = useState({})
    const [settingsSaving, setSettingsSaving] = useState(false)
    const [auditLogEntries, setAuditLogEntries] = useState([])
    const [confirmDeleteUser, setConfirmDeleteUser] = useState(null)
    const [confirmSuspendUser, setConfirmSuspendUser] = useState(null)
    const [globalSearch, setGlobalSearch] = useState('')
    const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    const globalSearchResults = useMemo(() => {
        const q = globalSearch.trim().toLowerCase()
        if (q.length < 2) return []
        const results = []
        ;(data?.recentUsers || []).forEach(u => {
            if ((u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)) {
                results.push({ type: 'user', label: u.name, sub: u.email || '', nav: 'User Management', id: u.seed })
            }
        })
        ;(data?.supportTickets || []).forEach(t => {
            if ((t.desc || t.message || t.subject || '').toLowerCase().includes(q)) {
                results.push({ type: 'ticket', label: t.desc || t.subject || 'Ticket', sub: `Ticket #${t.id}`, nav: 'Support Tickets' })
            }
        })
        ;(data?.topPrograms || []).forEach(p => {
            if ((p.name || '').toLowerCase().includes(q)) {
                results.push({ type: 'program', label: p.name, sub: p.enroll || '', nav: 'Programs' })
            }
        })
        return results.slice(0, 8)
    }, [globalSearch, data])

    useEffect(() => {
        const onResize = () => { if (window.innerWidth > 1024) setSidebarMobileOpen(false) }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    const handleSidebarToggle = useCallback(() => {
        if (window.innerWidth <= 1024) {
            setSidebarMobileOpen(o => !o)
        } else {
            setSidebarCollapsed(c => !c)
        }
    }, [])
    const notifRef = useRef(null)
    const notifBtnRef = useRef(null)

    const fetchUsers = useCallback((page = 1, search = '') => {
        const params = new URLSearchParams({ page, perPage: 20 })
        if (search) params.set('search', search)
        apiFetch(`/admin/users?${params}`)
            .then(r => {
                setUsersPage(r.page || 1)
            })
            .catch(() => {})
    }, [])

    const loadDashboard = useCallback(() => {
        apiFetch('/dashboard/admin')
            .then(d => { setData(d); setLoadError(null) })
            .catch((e) => setLoadError(e.message || 'Check your connection and try again.'))
            .finally(() => setLoading(false))
        apiFetch('/auth/me')
            .then(u => setUserPhoto(mediaUrl(u.photo)))
            .catch(() => {})
    }, [])

    useEffect(() => { loadDashboard() }, [loadDashboard])

    // Refresh dashboard data whenever the user returns to this tab.
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') loadDashboard()
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
    }, [loadDashboard])

    // Poll unread notifications so new contact messages/tickets appear in
    // near real time.
    useEffect(() => {
        const fetchUnread = () => {
            apiFetch('/notifications?unread=true')
                .then(n => setUnreadCount(Number.isFinite(n?.unreadCount) ? n.unreadCount : (Array.isArray(n) ? n.length : 0)))
                .catch(() => {})
        }
        fetchUnread()
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') fetchUnread()
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (activeNav === 'Profile') {
            setProfileLoading(true)
            apiFetch('/auth/me')
                .then(setProfileData)
                .catch(() => {})
                .finally(() => setProfileLoading(false))
        }
    }, [activeNav])

    // Lazy-load tab-specific data only when tab is activated
    useEffect(() => {
        if (activeNav === 'Media Assets') {
            setMediaAssetsLoading(true)
            apiFetch('/admin/media').then(r => setMediaAssets(r.assets || r.data || [])).catch(() => {}).finally(() => setMediaAssetsLoading(false))
        } else if (activeNav === 'Flagged Reports') {
            setFlaggedReportsLoading(true)
            apiFetch('/admin/flagged-reports').then(r => setFlaggedReports(r.reports || r.data || [])).catch(() => {}).finally(() => setFlaggedReportsLoading(false))
        } else if (activeNav === 'Configuration') {
            setPlatformSettingsLoading(true)
            apiFetch('/admin/settings').then(r => {
                const list = Array.isArray(r) ? r : (r.data || [])
                setPlatformSettings(list)
                const draft = {}
                list.forEach(s => { if (s.key) draft[s.key] = s.value })
                setSettingsDraft(draft)
            }).catch(() => {}).finally(() => setPlatformSettingsLoading(false))
        } else if (activeNav === 'Security & Audit') {
            apiFetch('/admin/audit-log?perPage=10').then(r => setAuditLogEntries(r.logs || [])).catch(() => {})
        }
    }, [activeNav])

    const recentUsers = data?.recentUsers || []
    const tickets = data?.supportTickets || []
    const activities = data?.activities || []
    const months = data?.userGrowth?.months || []
    const barData = data?.userGrowth?.barData || []
    const barValues = data?.userGrowth?.values || []
    const activeSubscribers = (data?.subscriptionTiers || []).reduce((s, t) => s + parseInt(String(t.count || '0').replace(/,/g, ''), 10), 0)
    const subscriberSharePct = activeSubscribers > 0 && (data?.kpis?.activeUsers ?? 0) > 0
        ? Math.min(100, Math.round(activeSubscribers / Math.max(data?.kpis?.activeUsers, 1) * 100))
        : 0
    const subscriberShare = subscriberSharePct + '%'

    const cursorDotRef = useRef(null)
    const cursorRingRef = useRef(null)
    const cursorPos = useRef({ x: 0, y: 0 })
    const ringPos = useRef({ x: 0, y: 0 })
    const rafRef = useRef(null)

    // ── Custom cursor ──
    useEffect(() => {
        const lastMove = { t: 0 }
        const handleMouse = (e) => {
            cursorPos.current = { x: e.clientX, y: e.clientY }
            lastMove.t = Date.now()
            if (cursorDotRef.current) {
                cursorDotRef.current.style.left = e.clientX + 'px'
                cursorDotRef.current.style.top = e.clientY + 'px'
            }
            if (!rafRef.current) rafRef.current = requestAnimationFrame(animate)
        }
        const animate = () => {
            ringPos.current.x += (cursorPos.current.x - ringPos.current.x) * 0.15
            ringPos.current.y += (cursorPos.current.y - ringPos.current.y) * 0.15
            if (cursorRingRef.current) {
                cursorRingRef.current.style.left = ringPos.current.x + 'px'
                cursorRingRef.current.style.top = ringPos.current.y + 'px'
            }
            // Pause the loop when the cursor is idle and the ring has
            // converged (saves CPU/battery on idle dashboards).
            const converged =
                Math.abs(ringPos.current.x - cursorPos.current.x) < 0.5 &&
                Math.abs(ringPos.current.y - cursorPos.current.y) < 0.5
            if (!converged || Date.now() - lastMove.t < 1000) {
                rafRef.current = requestAnimationFrame(animate)
            } else {
                rafRef.current = null
            }
        }
        document.addEventListener('mousemove', handleMouse)
        rafRef.current = requestAnimationFrame(animate)

        const hoverTargets = document.querySelectorAll('.ad-admin-dashboard a, .ad-admin-dashboard button, .ad-admin-dashboard input, .ad-nav-item, .ad-user-row, .ad-notif-item, .ad-modal-overlay, .ad-dash-card')
        const addHover = () => {
            if (cursorDotRef.current) cursorDotRef.current.classList.add('ad-cursor-hover')
            if (cursorRingRef.current) cursorRingRef.current.classList.add('ad-cursor-hover')
        }
        const removeHover = () => {
            if (cursorDotRef.current) cursorDotRef.current.classList.remove('ad-cursor-hover')
            if (cursorRingRef.current) cursorRingRef.current.classList.remove('ad-cursor-hover')
        }
        hoverTargets.forEach(el => {
            el.addEventListener('mouseenter', addHover)
            el.addEventListener('mouseleave', removeHover)
        })

        return () => {
            document.removeEventListener('mousemove', handleMouse)
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            hoverTargets.forEach(el => {
                el.removeEventListener('mouseenter', addHover)
                el.removeEventListener('mouseleave', removeHover)
            })
        }
    }, [])

    // ── Counters animation ──
    useEffect(() => {
        const t = setTimeout(() => setCountersVisible(true), 300)
        return () => clearTimeout(t)
    }, [])

    // ── Bar chart animation ──
    useEffect(() => {
        const t = setTimeout(() => setBarAnimated(true), 500)
        return () => clearTimeout(t)
    }, [])

    // ── Ring animation ──
    useEffect(() => {
        const t = setTimeout(() => setRingAnimated(true), 600)
        return () => clearTimeout(t)
    }, [])

    // ── Notif toggle ──
    useEffect(() => {
        const handleClick = (e) => {
            if (
                notifOpen &&
                notifRef.current &&
                !notifRef.current.contains(e.target) &&
                notifBtnRef.current &&
                !notifBtnRef.current.contains(e.target)
            ) {
                setNotifOpen(false)
            }
        }
        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [notifOpen])

    const handleNavClick = useCallback((label) => {
        if (label === 'Log Out') {
            authLogout()
            navigate('/login')
            return
        }
        if (label === 'Profile') {
            setActiveNav(label)
            setProfileModalOpen(true)
            return
        }
        setActiveNav(label)
    }, [authLogout, navigate])

    const handleUserRowClick = (user) => {
        apiFetch('/admin/users/' + user.id).then(setSelectedUser).catch(() => setSelectedUser(user))
        setUserModalOpen(true)
    }

    const closeModal = () => { setUserModalOpen(false); setSelectedUser(null) }

    const handleReplyOpen = (ticketId) => {
        setReplyTicketId(ticketId)
        setReplyMessage('')
        setReplyModalOpen(true)
    }

    const handleReplySubmit = async () => {
        if (!replyMessage.trim() || !replyTicketId) return
        setReplySubmitting(true)
        try {
            await apiFetch(`/admin/tickets/${replyTicketId}/reply`, {
                method: 'POST',
                body: JSON.stringify({ message: replyMessage })
            })
            showToast('Reply sent')
            setReplyModalOpen(false)
            apiFetch('/dashboard/admin').then(setData).catch(() => {})
        } catch (e) {
            swalError(e.message || 'Error sending reply')
        } finally {
            setReplySubmitting(false)
        }
    }

    return (
        <div className="admin-dashboard ad-admin-dashboard ad-grid-bg ad-noise">
            {/* Custom Cursor */}
            <div className="ad-cursor-dot" ref={cursorDotRef} />
            <div className="ad-cursor-ring" ref={cursorRingRef} />

            <Sidebar
                items={navItems}
                activeNav={activeNav}
                onNavClick={handleNavClick}
                userName={data?.userName || 'Admin'}
                userSubtitle="SUPER ADMIN"
                avatarUrl={userPhoto || ''}
                role="admin"
                mobileRight={(
                    <div className="ad-mobile-right">
                        <button
                            ref={notifBtnRef}
                            className="ad-mobile-icon-btn"
                            onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen) }}
                            aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && <span className="cd-notif-badge cd-mobile-badge">{unreadCount}</span>}
                        </button>
                        {userPhoto ? (
                            <img loading="lazy" src={userPhoto} alt="Admin" className="ad-header-avatar ad-mobile-avatar" />
                        ) : (
                            <div className="ad-header-avatar ad-mobile-avatar ad-avatar-initials">{(data?.userName || 'A').charAt(0).toUpperCase()}</div>
                        )}
                    </div>
                )}
                collapsed={sidebarCollapsed}
                onToggle={handleSidebarToggle}
                mobileOpen={sidebarMobileOpen}
                onMobileClose={() => setSidebarMobileOpen(false)}
            />

            {loading && (
                <div className="cl-dash-loading">
                    <DashboardSkeleton />
                </div>
            )}

            {!loading && loadError && (
                <div className="cl-dash-error" role="alert">
                    <div className="cl-dash-error-card">
                        <h2>We couldn't load your dashboard</h2>
                        <p>{loadError}</p>
                        <button className="ad-btn ad-btn-primary" onClick={() => { setLoadError(null); setLoading(true); loadDashboard() }}>
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ MAIN CONTENT ═══ */}
            <main className="ad-main" style={{ marginLeft: sidebarCollapsed ? 64 : 260 }}>
                {activeNav === 'User Management' ? <AdminUsers /> : activeNav === 'Coaches' ? <AdminCoaches /> : activeNav === 'Plans' ? <AdminPlans /> : activeNav === 'Coupons' ? <AdminCoupons /> : activeNav === 'Payments' ? <AdminPayments /> : activeNav === 'Billing & Subs' ? <AdminSubscriptions /> : activeNav === 'Support Tickets' ? <AdminTickets /> : activeNav === 'Blog' ? <AdminBlog /> : activeNav === 'Messages' ? <AdminMessages /> : activeNav === 'Exercises' ? <AdminExercises /> : activeNav === 'Challenges' ? <AdminChallenges /> : activeNav === 'Recipes' ? <AdminRecipes /> : activeNav === 'Analytics' ? <AdminAnalytics /> : activeNav === 'Forum' ? <AdminForum /> : activeNav === 'Notifications' ? <AdminNotifications /> : activeNav === 'Programs' ? <ProgramsManager role="admin" /> : activeNav === 'Settings' ? <SettingsPanel /> : activeNav === 'Video Library' ? (
                    <VideoLibrary />
                ) : activeNav === 'Media Assets' ? (
                    <div className="ad-main-content">
                        <div className="ad-content-header">
                            <h1 className="ad-content-title"><ImageIcon size={24} /> Media Assets</h1>
                            <div className="ad-content-actions">
                                <label className="ad-btn ad-btn-secondary ad-btn-sm" style={{cursor:'pointer'}}>
                                    <Upload size={16} /> Upload File
                                    <input type="file" style={{display:'none'}} onChange={async (e) => {
                                    const file = e.target.files?.[0]; if (!file) return;
                                    const formData = new FormData(); formData.append('file', file);
                                    try {
                                        await apiFetch('/admin/media', { method: 'POST', body: formData });
                                        showToast('File uploaded');
                                        apiFetch('/admin/media').then(r => setMediaAssets(r.assets || r.data || [])).catch(() => {})
                                    } catch (err) { swalError(err.message || 'Error uploading file') }
                                }} />
                                </label>
                            </div>
                        </div>
                        <div className="ad-section-grid" style={{padding:'24px',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))'}}>
                            {mediaAssetsLoading ? (
                                <div style={{gridColumn:'1/-1',padding:32,textAlign:'center',color:'var(--text-muted)'}}>Loading...</div>
                            ) : mediaAssets.length === 0 ? (
                                <div style={{gridColumn:'1/-1',padding:32,textAlign:'center',color:'var(--text-muted)'}}>No media assets found. Upload a file to get started.</div>
                            ) : mediaAssets.map((a,i) => (
                                <div key={a.id || i} className="ad-dash-card ad-kpi-card" style={{padding:'12px',cursor:'pointer',aspectRatio:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative'}}>
                                    {a.file_type === 'image' ? (
                                        <img src={'/api/' + a.file_path} alt={a.file_name} style={{width:'100%',height:'60%',objectFit:'cover',borderRadius:6,marginBottom:8}} />
                                    ) : a.file_type === 'video' ? (
                                        <Video size={28} style={{color:'rgba(255,214,0,.4)',marginBottom:8}} />
                                    ) : (
                                        <FileText size={28} style={{color:'rgba(255,214,0,.4)',marginBottom:8}} />
                                    )}
                                    <span style={{fontSize:12,color:'var(--text-muted)',textAlign:'center',wordBreak:'break-all'}}>{a.file_name}</span>
                                    <button className="ad-btn ad-btn-danger ad-btn-xs" style={{position:'absolute',top:6,right:6,padding:'2px 6px',minWidth:'auto'}} onClick={async () => {
                                        if (!(await confirmSwal('Delete ' + a.file_name + '?'))) return;
                                        try { await apiFetch('/admin/media/' + a.id, { method: 'DELETE' }); showToast('Deleted'); apiFetch('/admin/media').then(r => setMediaAssets(r.assets || r.data || [])).catch(() => {}) }
                                        catch (e) { swalError(e.message || 'Error') }
                                    }}><X size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeNav === 'Flagged Reports' ? (
                    <div className="ad-main-content">
                        <div className="ad-content-header">
                            <h1 className="ad-content-title"><AlertTriangle size={24} /> Flagged Reports</h1>
                            <button
                                className="ad-btn ad-btn-primary ad-btn-sm"
                                onClick={async () => {
                                    const pending = flaggedReports.filter(r => r.status === 'pending')
                                    if (!pending.length) { showToast('No pending reports to review'); return }
                                    if (!(await confirmSwal(`Mark all ${pending.length} pending reports as reviewed?`))) return
                                    let done = 0
                                    for (const r of pending) {
                                        try {
                                            await apiFetch('/admin/flagged-reports/' + r.id, { method: 'PUT', body: JSON.stringify({ status: 'reviewed' }) })
                                            done++
                                        } catch { /* continue with the rest */ }
                                    }
                                    showToast(`${done} report${done !== 1 ? 's' : ''} marked as reviewed`)
                                    apiFetch('/admin/flagged-reports').then(r2 => setFlaggedReports(r2.reports || r2.data || [])).catch(() => {})
                                }}
                            ><Shield size={16} /> Review All</button>
                        </div>
                        <div className="ad-dash-card" style={{margin:'24px'}}>
                            {flaggedReportsLoading ? (
                                <div style={{padding:24,textAlign:'center',color:'var(--text-muted)'}}>Loading...</div>
                            ) : flaggedReports.length === 0 ? (
                                <div style={{padding:24,textAlign:'center',color:'var(--text-muted)'}}>No flagged reports found</div>
                            ) : flaggedReports.map((r,i) => (
                                <div key={r.id || i} className="ad-prog-item" style={{borderBottom:'1px solid rgba(255,255,255,.05)',padding:'16px 0',cursor:'pointer'}}>
                                    <div className="ad-prog-info" style={{flex:1}}>
                                        <div className="ad-prog-name">{r.reporterName || 'User #' + r.reporterId}</div>
                                        <div className="ad-prog-enroll">{r.reason} · {r.contentType} #{r.contentId} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</div>
                                    </div>
                                    <span className={'ad-status-badge ad-status-'+(r.status==='action_taken'||r.status==='reviewed'?'active':r.status==='dismissed'?'cancelled':'pending')} style={{marginRight:12}}>{r.status}</span>
                                    <div style={{display:'flex',gap:4}}>
                                        {r.status === 'pending' && (
                                            <>
                                                <button className="ad-btn ad-btn-primary ad-btn-xs" onClick={async () => {
                                                    try { await apiFetch('/admin/flagged-reports/' + r.id, { method: 'PUT', body: JSON.stringify({ status: 'reviewed' }) }); showToast('Marked as reviewed'); apiFetch('/admin/flagged-reports').then(r2 => setFlaggedReports(r2.reports || r2.data || [])).catch(() => {}) }
                                                    catch (e) { swalError(e.message || 'Error') }
                                                }}>Review</button>
                                                <button className="ad-btn ad-btn-secondary ad-btn-xs" onClick={async () => {
                                                    try { await apiFetch('/admin/flagged-reports/' + r.id, { method: 'PUT', body: JSON.stringify({ status: 'dismissed' }) }); showToast('Dismissed'); apiFetch('/admin/flagged-reports').then(r2 => setFlaggedReports(r2.reports || r2.data || [])).catch(() => {}) }
                                                    catch (e) { swalError(e.message || 'Error') }
                                                }}>Dismiss</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeNav === 'Configuration' ? (
                    <div className="ad-main-content">
                        <div className="ad-content-header">
                            <h1 className="ad-content-title"><Settings size={24} /> Configuration</h1>
                            <button
                                className="ad-btn ad-btn-primary ad-btn-sm"
                                disabled={settingsSaving}
                                onClick={async () => {
                                    if (Object.keys(settingsDraft).length === 0) return
                                    setSettingsSaving(true)
                                    try {
                                        await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(settingsDraft) })
                                        showToast('Settings saved')
                                        apiFetch('/admin/settings').then(r => {
                                            const list = Array.isArray(r) ? r : (r.data || [])
                                            setPlatformSettings(list)
                                        }).catch(() => {})
                                    } catch (e) {
                                        swalError(e.message || 'Error saving settings')
                                    } finally {
                                        setSettingsSaving(false)
                                    }
                                }}
                            ><Download size={16} /> {settingsSaving ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                        <div className="ad-section-grid ad-section-grid-2" style={{padding:'24px'}}>
                            {platformSettingsLoading ? (
                                <div style={{gridColumn:'1/-1',padding:32,textAlign:'center',color:'var(--text-muted)'}}>Loading...</div>
                            ) : (
                                ['General', 'Limits'].map(section => (
                                <div key={section} className="ad-dash-card">
                                    <h3 className="ad-section-title-sm">{section === 'General' ? 'General Settings' : 'Platform Limits'}</h3>
                                    <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:16}}>
                                        {platformSettings.filter(s => section === 'General' ? ['platform_name','support_email','default_language','timezone'].includes(s.key) : ['max_users','max_storage_gb','api_rate_limit','file_upload_max_mb'].includes(s.key)).map(s => (
                                            <div key={s.key} data-setting-key={s.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                                                <span style={{color:'#a3a3a3',fontSize:13}}>{s.description || s.key}</span>
                                                {s.key === 'default_language' ? (
                                                    <select
                                                        className="ad-content-search"
                                                        style={{width:'auto',minWidth:120,padding:'4px 8px',fontSize:13}}
                                                        value={settingsDraft[s.key] ?? s.value ?? ''}
                                                        onChange={e => setSettingsDraft(prev => ({ ...prev, [s.key]: e.target.value }))}
                                                    >
                                                        <option value="en">English (US)</option>
                                                        <option value="pt">Português</option>
                                                        <option value="fr">Français</option>
                                                    </select>
                                                ) : (
                                                    <input
                                                        className="ad-content-search"
                                                        style={{width:'auto',maxWidth:180,padding:'4px 8px',fontSize:13,textAlign:'right'}}
                                                        value={settingsDraft[s.key] ?? s.value ?? ''}
                                                        onChange={e => setSettingsDraft(prev => ({ ...prev, [s.key]: e.target.value }))}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                        {platformSettings.filter(s => section === 'General' ? ['platform_name','support_email','default_language','timezone'].includes(s.key) : ['max_users','max_storage_gb','api_rate_limit','file_upload_max_mb'].includes(s.key)).length === 0 && (
                                            <div style={{color:'var(--text-muted)',fontSize:13,textAlign:'center',padding:16}}>No settings available</div>
                                        )}
                                    </div>
                                </div>
                            )))}
                        </div>
                    </div>
                ) : activeNav === 'Security & Audit' ? (
                    <div className="ad-main-content">
                        <div className="ad-content-header">
                            <h1 className="ad-content-title"><Shield size={24} /> Security & Audit</h1>
                            <button
                                className="ad-btn ad-btn-primary ad-btn-sm"
                                onClick={() => {
                                    if (!auditLogEntries.length) { showToast('No audit log entries to export'); return }
                                    exportToCSV(auditLogEntries.map(a => ({
                                        timestamp: a.createdAt || '',
                                        admin: a.adminName || '',
                                        action: a.action || '',
                                        targetType: a.targetType || '',
                                        targetId: a.targetId ?? '',
                                        details: a.details || '',
                                    })), 'fitpower-audit-log.csv')
                                    showToast('Audit log exported')
                                }}
                            ><Download size={16} /> Export Audit Log</button>
                        </div>
                        <div className="ad-kpi-grid" style={{padding:'0 24px'}}>
                            <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-green"><Shield /></div><div className="ad-kpi-value">{data?.security?.score || 'A+'}</div><div className="ad-kpi-label">Security Score</div></div>
                            <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-blue"><Users /></div><div className="ad-kpi-value">{(data?.security?.activeSessions || 0).toLocaleString()}</div><div className="ad-kpi-label">Active Sessions (24h)</div></div>
                            <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-yellow"><AlertTriangle /></div><div className="ad-kpi-value">{data?.security?.warnings ?? 0}</div><div className="ad-kpi-label">Warnings (30d)</div></div>
                            <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-red"><Ban /></div><div className="ad-kpi-value">{data?.security?.blockedAttempts ?? 0}</div><div className="ad-kpi-label">Blocked Attempts (7d)</div></div>
                        </div>
                        <div className="ad-dash-card" style={{margin:'24px'}}>
                            <h3 className="ad-section-title-sm">Recent Activity Log</h3>
                            <div className="ad-activity-list" style={{marginTop:16}}>
                                {auditLogEntries.length > 0 ? auditLogEntries.map((a,i)=>(
                                    <div key={i} className="ad-dash-card ad-activity-item" style={{margin:0,borderRadius:0,borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                                        <div className="ad-activity-icon ad-blue"><Activity size={16} /></div>
                                        <div className="ad-activity-body"><div className="ad-activity-line"><span className="ad-activity-text">{a.adminName}: {a.action} on {a.targetType} #{a.targetId}</span></div><div className="ad-activity-sub">{a.action}</div></div>
                                        <span className="ad-activity-time">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</span>
                                    </div>
                                )) : <div className="ad-dash-card" style={{padding:16,textAlign:'center',color:'#666'}}>No recent activity</div>}
                            </div>
                        </div>
                    </div>
                ) : activeNav === 'Profile' ? (
                    <div className="ad-main-content">
                        <div className="cl-profile-view">
                            <div className="cl-content">
                                <div className="cl-space">
                                    {profileLoading ? (
                                        <div className="ad-spinner" style={{ margin: '80px auto' }} />
                                    ) : profileData ? (
                                        <div className="cl-profile-page">
                                            <div className="cl-profile-cover">
                                                <div className="cl-profile-avatar-large">
                                                    {profileData.photo ? (
                                                        <img src={mediaUrl(profileData.photo)} alt="" />
                                                    ) : (
                                                        <span>{profileData.firstName?.[0]}{profileData.lastName?.[0]}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="cl-profile-info-section">
                                                <div className="cl-profile-info-header">
                                                    <div>
                                                        <h1 className="cl-profile-name">{profileData.firstName} {profileData.lastName}</h1>
                                                        <p className="cl-profile-email">{profileData.email}</p>
                                                        <span className="cl-profile-role">{profileData.role}</span>
                                                    </div>
                                                    <button className="ad-btn ad-btn-primary" onClick={() => setProfileModalOpen(true)}>
                                                        Edit Profile
                                                    </button>
                                                </div>
                                                <div className="cl-profile-details-grid">
                                                    <div className="ad-dash-card">
                                                        <div className="cl-profile-detail-label">Fitness Level</div>
                                                        <div className="cl-profile-detail-value">{profileData.fitnessLevel ? profileData.fitnessLevel.charAt(0).toUpperCase() + profileData.fitnessLevel.slice(1) : 'Not set'}</div>
                                                    </div>
                                                    <div className="ad-dash-card">
                                                        <div className="cl-profile-detail-label">Primary Goal</div>
                                                        <div className="cl-profile-detail-value">{profileData.primaryGoal ? profileData.primaryGoal.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Not set'}</div>
                                                    </div>
                                                    <div className="ad-dash-card">
                                                        <div className="cl-profile-detail-label">Training Days / Week</div>
                                                        <div className="cl-profile-detail-value">{profileData.trainingDays || 'Not set'}</div>
                                                    </div>
                                                    <div className="ad-dash-card">
                                                        <div className="cl-profile-detail-label">Member Since</div>
                                                        <div className="cl-profile-detail-value">{profileData.memberSince ? new Date(profileData.memberSince).toLocaleDateString() : '—'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ height: 200 }} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                <header className="ad-header">
                    <div className="ad-header-inner">
                        <div className="ad-header-left">
                            <div className="ad-search-wrap" style={{ position: 'relative' }}>
                                <Search className="ad-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search users, tickets, programs..."
                                    className="ad-search-input"
                                    aria-label="Search users, tickets and programs"
                                    role="combobox"
                                    aria-expanded={globalSearchOpen && globalSearch.trim().length >= 2}
                                    value={globalSearch}
                                    onChange={e => { setGlobalSearch(e.target.value); setGlobalSearchOpen(true) }}
                                    onFocus={() => setGlobalSearchOpen(true)}
                                    onBlur={() => setTimeout(() => setGlobalSearchOpen(false), 200)}
                                />
                                {globalSearchOpen && globalSearchResults.length > 0 && (
                                    <div className="cd-search-dropdown" role="listbox" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60 }}>
                                        {globalSearchResults.map((r, i) => (
                                            <div
                                                key={i}
                                                role="option"
                                                aria-selected="false"
                                                tabIndex={0}
                                                className="cd-search-result"
                                                onClick={() => {
                                                    if (r.type === 'user') { setUsersSearch(r.label || ''); fetchUsers(1, r.label || '') }
                                                    setActiveNav(r.nav)
                                                    setGlobalSearch('')
                                                    setGlobalSearchOpen(false)
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault()
                                                        if (r.type === 'user') { setUsersSearch(r.label || ''); fetchUsers(1, r.label || '') }
                                                        setActiveNav(r.nav)
                                                        setGlobalSearch('')
                                                        setGlobalSearchOpen(false)
                                                    }
                                                }}
                                            >
                                                <span className="cd-search-type">{r.type}</span>
                                                <div className="cd-search-result-info">
                                                    <span className="cd-search-result-label">{r.label}</span>
                                                    <span className="cd-search-result-sub">{r.sub}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {globalSearchOpen && globalSearch.trim().length >= 2 && globalSearchResults.length === 0 && (
                                    <div className="cd-search-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60 }}>
                                        <div className="cd-search-empty">No results found</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="ad-header-right">
                            <button
                                ref={notifBtnRef}
                                className="ad-notif-btn"
                                onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen) }}
                                aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                                aria-expanded={notifOpen}
                            >
                                <Bell />
                                {unreadCount > 0 && <span className="cd-notif-badge">{unreadCount}</span>}
                            </button>
                            <div className="ad-header-divider" />
                            <button onClick={() => setProfileModalOpen(true)} className="ad-header-profile">
                                {userPhoto ? (
                                    <img loading="lazy"
                                        src={userPhoto}
                                        alt="Admin"
                                        className="ad-header-avatar"
                                    />
                                ) : (
                                    <div className="ad-header-avatar ad-avatar-initials">
                                        {(data?.userName || 'A').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span className="ad-header-name">{(data?.userName || 'Admin').split(' ')[0]}</span>
                                <ChevronDown className="ad-header-chevron" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Notification Panel */}
                <NotificationsDropdown
                    isOpen={notifOpen}
                    onClose={() => setNotifOpen(false)}
                    notifRef={notifRef}
                    notifBtnRef={notifBtnRef}
                />

                {/* Dashboard Content */}
                <div className="ad-dash-content">
                    <div className="ad-dash-space">
                        {/* ═══ OPS WARNINGS ═══ */}
                        {data?.ops && (!data.ops.emailsConfigured || !data.ops.stripeConfigured) && (
                            <div className="ad-ops-banner">
                                <AlertTriangle size={16} />
                                <span>
                                    {!data.ops.emailsConfigured && 'Email is not configured — welcome, verification and payment emails are not being sent. '}
                                    {!data.ops.stripeConfigured && 'Stripe is not configured — payments are disabled. '}
                                    Set the environment variables to enable them.
                                </span>
                            </div>
                        )}

                        {/* ═══ WELCOME + KPI CARDS ═══ */}
                        <section className="ad-welcome-wrap ad-fade-in-up">
                            <div className="ad-dash-card ad-welcome-card">
                                <div>
                                    <p className="ad-welcome-label">Admin Control Panel</p>
                                    <h1 className="ad-welcome-title">Welcome back, {(data?.userName || 'Admin').split(' ')[0]} 👋</h1>
                                    <p className="ad-welcome-desc">
                                        Platform currently tracking <span className="ad-highlight-yellow"><strong>{(data?.kpis?.activeUsers ?? 0).toLocaleString()} active users</strong></span>.{' '}
                                        Monthly MRR is{' '}
                                        <span className="ad-highlight-green"><strong>${(data?.kpis?.monthlyMRR ?? 0).toLocaleString()}</strong></span> with a retention rate of {data?.kpis?.retentionRate ?? '—'}%.
                                    </p>
                                </div>
                                <div className="ad-welcome-actions">
                                    <button className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => setActiveNav('Programs')}>
                                        <Users /> Manage Programs
                                    </button>
                                </div>
                            </div>

                            <div className="ad-kpi-grid">
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-blue"><Users /></div>
                                    <div className="ad-kpi-value"><Counter target={data?.kpis?.activeUsers ?? 0} visible={countersVisible} /></div>
                                    <div className="ad-kpi-label">Active Users</div>
                                </div>
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-green"><DollarSign /></div>
                                    <div className="ad-kpi-value">$<Counter target={data?.kpis?.monthlyMRR ?? 0} visible={countersVisible} /></div>
                                    <div className="ad-kpi-label">Monthly MRR</div>
                                </div>
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-yellow"><TrendingUp /></div>
                                    <div className="ad-kpi-value">{data?.kpis?.retentionRate ?? '—'}<span className="ad-kpi-label" style={{ fontSize: '16px', display: 'inline', margin: 0 }}>%</span></div>
                                    <div className="ad-kpi-label">Retention Rate</div>
                                </div>
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-red"><AlertCircle /></div>
                                    <div className="ad-kpi-value ad-kpi-red">{data?.kpis?.openTickets ?? 0}</div>
                                    <div className="ad-kpi-label">Open Tickets</div>
                                </div>
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-purple"><Shield /></div>
                                    <div className="ad-kpi-value">{data ? (data.security?.score ?? '—') : '—'}</div>
                                    <div className="ad-kpi-label">Security Score</div>
                                </div>
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-blue"><Target /></div>
                                    <div className="ad-kpi-value">{data?.infrastructure?.[1]?.value ?? '—'}</div>
                                    <div className="ad-kpi-label">Subscription Rate</div>
                                </div>
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-green"><Award /></div>
                                    <div className="ad-kpi-value">{data?.infrastructure?.[3]?.value ?? '—'}</div>
                                    <div className="ad-kpi-label">Coach Approval</div>
                                </div>
                            </div>
                        </section>

                        {/* ═══ USER GROWTH + SUBSCRIPTION BREAKDOWN ═══ */}
                        <section className="ad-section-grid ad-section-grid-5 ad-fade-in-up-d1">
                            <div className="lg:col-span-3 ad-dash-card">
                                <div className="ad-section-header">
                                    <h3 className="ad-section-title">User Acquisition (last 8 months)</h3>
                                </div>
                                {months.length === 0 ? (
                                    <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No signup data yet.
                                    </div>
                                ) : (
                                    <div className="ad-bar-chart">
                                        {months.map((m, i) => (
                                            <div key={m + '-' + i} className="ad-bar-col">
                                                <span className="ad-bar-label">{m}</span>
                                                <div
                                                    className={'ad-bar-fill' + (i === months.length - 1 ? ' ad-bar-yellow' : ' ad-bar-blue')}
                                                    style={{ height: barAnimated ? barData[i] + '%' : '0%' }}
                                                />
                                                <span className={i === months.length - 1 ? 'ad-bar-value-highlight' : 'ad-bar-value'}>
                                                    {barValues[i]}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="ad-dash-card">
                                <div className="ad-section-header">
                                    <h3 className="ad-section-title">Subscription Tiers</h3>
                                    <span className="ad-section-sub">Current billing cycle</span>
                                </div>
                                <div className="ad-donut-wrap">
                                    <div className="ad-donut-relative">
                                        <svg className="ad-donut-svg" viewBox="0 0 100 100">
                                            <circle className="ad-donut-bg" cx="50" cy="50" r="42" />
                                            <circle
                                                className="ad-donut-fill"
                                                cx="50" cy="50" r="42"
                                                strokeDashoffset={ringAnimated ? (264 - (subscriberSharePct / 100) * 264) : 264}
                                            />
                                        </svg>
                                        <div className="ad-donut-center">
                                            <span className="ad-donut-pct">{subscriberShare}</span>
                                        </div>
                                    </div>
                                    <div className="ad-donut-info">
                                        <h4>{activeSubscribers.toLocaleString()}</h4>
                                        <p>Active subscribers</p>
                                    </div>
                                </div>
                                <div className="ad-tier-list">
                                    {(data?.subscriptionTiers || []).map(t => (
                                        <div key={t.name} className="ad-tier-row">
                                            <div className="ad-tier-header">
                                                <span className="ad-tier-name">{t.name}</span>
                                                <span className="ad-tier-count">{t.count || 0}</span>
                                            </div>
                                            <div className="ad-tier-bar">
                                                <div className={'ad-tier-fill ad-tier-' + t.cls} style={{ width: ringAnimated ? t.pct : '0%' }} />
                                            </div>
                                        </div>
                                    ))}
                                    {(data?.subscriptionTiers || []).length === 0 && (
                                        <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No active subscriptions yet.
                                        </div>
                                    )}
                                </div>
                                    <button className="ad-btn ad-btn-secondary ad-btn-sm" style={{marginTop:8,width:'100%',justifyContent:'center'}} onClick={() => setActiveNav('Programs')}>
                                        View Full Breakdown →
                                    </button>
                            </div>
                        </section>

                        {/* ═══ REVENUE + TOP PROGRAMS + INFRASTRUCTURE ═══ */}
                        <section className="ad-section-grid ad-section-grid-3 ad-fade-in-up-d2">
                            {/* Revenue */}
                            <div className="ad-dash-card">
                                <div className="ad-revenue-header">
                                    <h3 className="ad-section-title-sm">Revenue Breakdown</h3>
                                </div>
                                <div className="ad-revenue-total">
                                    <div className="ad-revenue-amount">${(data?.kpis?.monthlyMRR ?? 0).toLocaleString()}</div>
                                    <div className="ad-revenue-target">Monthly MRR</div>
                                </div>
                                <div className="ad-revenue-list">
                                    {(data?.revenueBreakdown || []).map(r => (
                                        <div key={r.label} className="ad-revenue-item">
                                            <div className="ad-revenue-item-header">
                                                <span className="ad-revenue-item-label">{r.label}</span>
                                                <span className="ad-revenue-item-value">{r.value}</span>
                                            </div>
                                            <div className="ad-revenue-bar">
                                                <div className={'ad-revenue-fill ad-' + r.cls} style={{ width: barAnimated ? r.pct + '%' : '0%' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top Programs */}
                            <div className="ad-dash-card">
                                <div className="ad-section-header">
                                    <h3 className="ad-section-title-sm">Top Performing Programs</h3>
                                    <span className="ad-section-sub">By active enrollment</span>
                                </div>
                                <div className="ad-prog-list">
                                    {(data?.topPrograms || []).map((p, i) => {
                                        const iconMap = { Flame, Dumbbell, Heart, Zap, Target }
                                        const IconComp = iconMap[p.icon] || Flame
                                        return (
                                        <div key={p.name || i} className="ad-prog-item">
                                            <div className={'ad-prog-icon ad-' + (p.cls || 'orange')}>
                                                <IconComp />
                                            </div>
                                            <div className="ad-prog-info">
                                                <div className="ad-prog-name">{p.name}</div>
                                                <div className="ad-prog-enroll">{p.enroll}</div>
                                            </div>
                                        </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Infrastructure */}
                            <div className="ad-dash-card">
                                <div className="ad-section-header">
                                    <h3 className="ad-section-title-sm">Infrastructure Health</h3>
                                    <span className="ad-infra-status">
                                        <span className="ad-infra-dot" /> All Systems Operational
                                    </span>
                                </div>
                                <div className="ad-infra-list">
                                    {(data?.infrastructure || []).map(i => (
                                        <div key={i.label} className="ad-infra-item">
                                            <div className="ad-infra-header">
                                                <span className="ad-infra-label">{i.label}</span>
                                                <span className="ad-infra-value">{i.value}</span>
                                            </div>
                                            <div className="ad-infra-bar">
                                                <div className={'ad-infra-fill ad-' + i.cls} style={{ width: barAnimated ? i.pct + '%' : '0%' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="ad-infra-footer">
                                    <div className="ad-infra-meta">Services: API · Database · WebSocket · Media</div>
                                    <button className="ad-infra-link" onClick={() => setActiveNav('Security & Audit')}>
                                        View Security & Audit →
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* ═══ USER TABLE + TICKETS ═══ */}
                        <section className="ad-section-grid ad-section-grid-2 ad-fade-in-up-d3">
                            <div className="ad-dash-card">
                                <div className="ad-section-header">
                                    <h3 className="ad-section-title-sm">Recent User Registrations</h3>
                                    <button className="ad-table-link" onClick={() => { setActiveNav('User Management'); fetchUsers() }}>View All →</button>
                                </div>
                                <table className="ad-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Tier</th>
                                            <th>Status</th>
                                            <th>Registered</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentUsers.map(u => (
                                            <tr key={u.seed} className="ad-user-row" onClick={() => handleUserRowClick(u)}>
                                                <td>
                                                    <div className="ad-user-cell">
                                                        <Avatar
                                                            name={u.name}
                                                            src={u.photo || null}
                                                            size={40}
                                                            className="ad-user-avatar"
                                                        />
                                                        <div className="ad-user-cell-info">
                                                            <div>{u.name}</div>
                                                            <div>{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={'ad-tier-label ad-tier-' + u.tierClass}>{u.tier}</span>
                                                </td>
                                                <td>
                                                    <span className={'ad-status-badge ad-status-' + (u.status === 'Active' ? 'active' : 'pending')}>
                                                        <span className="ad-status-dot" />
                                                        {u.status}
                                                    </span>
                                                </td>
                                                <td><span className="ad-time">{u.registered}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="ad-dash-card">
                                <div className="ad-section-header">
                                    <h3 className="ad-section-title-sm">Support Queue</h3>
                                    <button className="ad-table-link" onClick={() => showToast('All tickets shown below')}>Full Queue →</button>
                                </div>
                                <div className="ad-ticket-list">
                                    {tickets.map(t => (
                                        <div
                                            key={t.id}
                                            className={'ad-ticket-item' + (t.yellowHover ? ' ad-ticket-yellow' : '')}
                                        >
                                            <div className="ad-ticket-top">
                                                <div className="ad-ticket-id">{t.id}</div>
                                                <span className="ad-ticket-time">{t.time}</span>
                                            </div>
                                            <div className="ad-ticket-desc">{t.desc}</div>
                                            <div className="ad-ticket-top" style={{ marginBottom: 0 }}>
                                                <div className="ad-ticket-user">
                                                    <Avatar
                                                        name={t.user}
                                                        src={t.photo || null}
                                                        size={30}
                                                    />
                                                    <span>{t.user} · {t.userTier}</span>
                                                </div>
                                                <div style={{display:'flex',alignItems:'center',gap:8}}>
                                                    <button className="ad-btn ad-btn-primary ad-btn-xs" onClick={(e) => { e.stopPropagation(); handleReplyOpen(String(t.id).replace('#', '')) }}>Reply</button>
                                                    <span className={'ad-status-badge ad-status-' + t.severityClass}>
                                                        {t.severity}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* ═══ ACTIVITY LOG ═══ */}
                        <section className="ad-fade-in-up-d4">
                            <div className="ad-activity-header">
                                <h3 className="ad-section-title">System Activity Log</h3>
                                <button
                                    className="ad-activity-export"
                                    onClick={() => {
                                        if (!activities.length) { showToast('No activity to export'); return }
                                        exportToCSV(activities.map(a => ({
                                            time: a.time || '',
                                            activity: a.text || '',
                                            details: a.sub || '',
                                            badge: a.badge || '',
                                        })), 'fitpower-activity-log.csv')
                                        showToast('Activity log exported')
                                    }}
                                >
                                    Export Full Log <ArrowRight />
                                </button>
                            </div>
                            <div className="ad-activity-list">
                                {activities.map((a, i) => {
                                    const iconMap = { UserPlus, CreditCard, Video, AlertTriangle, Flame, Dumbbell, Heart, Zap, Target, Activity: BarChart3 }
                                    const IconComp = iconMap[a.icon] || iconMap.Activity
                                    return (
                                    <div key={i} className="ad-dash-card ad-activity-item">
                                        <div className={'ad-activity-icon ad-' + a.iconClass}>
                                            <IconComp />
                                        </div>
                                        <div className="ad-activity-body">
                                            <div className="ad-activity-line">
                                                <span className="ad-activity-text">{a.text}</span>
                                                {a.badge && (
                                                    <span className={'ad-activity-badge ad-badge-' + a.badgeClass}>
                                                        {a.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="ad-activity-sub">{a.sub}</div>
                                        </div>
                                        <span className="ad-activity-time">{a.time}</span>
                                    </div>
                                    )
                                })}
                            </div>
                        </section>

                        <div className="ad-spacer" />
                    </div>
                </div>
                    </>
                )}
            </main>

            {/* ═══ USER DETAIL MODAL ═══ */}
            <div className={'ad-modal-overlay' + (userModalOpen ? ' ad-modal-open' : '')} onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
                <div className="ad-modal-content">
                    <div className="ad-modal-hdr">
                        <h3 className="ad-modal-title">User Profile</h3>
                        <button className="ad-modal-close" onClick={closeModal}>
                            <X />
                        </button>
                    </div>
                    <div className="ad-modal-profile">
                        <Avatar
                            name={selectedUser ? selectedUser.firstName + ' ' + selectedUser.lastName : 'User'}
                            src={selectedUser?.photo || null}
                            size={80}
                            className="ad-modal-avatar"
                        />
                        <div>
                            <div className="ad-modal-user-name">{selectedUser?.firstName} {selectedUser?.lastName}</div>
                            <div className="ad-modal-user-meta">{selectedUser?.email || ''} · UID: {selectedUser?.id || 'N/A'}</div>
                            <div className="ad-modal-user-tags">
                                <span className={'ad-status-badge ad-status-' + ((selectedUser?.status || '') === 'active' || (selectedUser?.status || '') === 'Active' ? 'active' : 'pending')}>
                                    <span className="ad-status-dot" />{selectedUser?.status || 'Active'}
                                </span>
                                <span style={{ color: 'var(--power-500)', fontSize: '12px', fontWeight: 600 }}>{(selectedUser?.role || 'client').toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="ad-modal-info-grid">
                        {[
                            { label: 'Member Since', value: selectedUser?.memberSince ? new Date(selectedUser.memberSince).toLocaleDateString() : selectedUser?.registered || 'N/A' },
                            { label: 'Last Active', value: selectedUser?.lastActive ? new Date(selectedUser.lastActive).toLocaleDateString() : 'N/A' },
                            { label: 'Subscription', value: selectedUser?.subscription?.plan || 'No Plan' },
                            { label: 'Current Program', value: selectedUser?.currentProgram?.name || selectedUser?.programs?.[0]?.name || 'None' },
                            { label: 'Fitness Level', value: selectedUser?.fitnessLevel || 'N/A' },
                            { label: 'Primary Goal', value: selectedUser?.primaryGoal || 'N/A' },
                        ].map(info => (
                            <div key={info.label} className="ad-modal-info-item">
                                <div className="ad-modal-info-label">{info.label}</div>
                                <div className="ad-modal-info-value">{info.value}</div>
                            </div>
                        ))}
                    </div>
                    <div className="ad-modal-actions">
                        <button className="ad-btn ad-btn-primary" onClick={() => {
                            setConfirmSuspendUser(selectedUser)
                        }}>
                            {selectedUser?.status === 'suspended' ? 'Reactivate' : 'Suspend User'}
                        </button>
                        <button className="ad-btn ad-btn-secondary" onClick={async () => {
                            const newRole = await swalSelect(
                                { admin: 'Admin', coach: 'Coach', client: 'Client' },
                                {
                                    title: 'Change Role',
                                    text: `New role for ${selectedUser?.firstName || 'user'} ${selectedUser?.lastName || ''}`,
                                    current: selectedUser?.role || 'client',
                                    confirmText: 'Update Role',
                                }
                            )
                            if (!newRole) return
                            if (newRole === selectedUser?.role) return
                            apiFetch('/admin/users/' + selectedUser?.id, { method: 'PUT', body: JSON.stringify({ role: newRole }) })
                                .then(() => {
                                    swalSuccess(`${selectedUser?.firstName || 'User'}'s role updated to ${newRole}.`, 'Role updated')
                                    fetchUsers(usersPage, usersSearch)
                                })
                                .catch(e => swalError(e.message || 'Could not update the role'))
                        }}>
                            Change Role
                        </button>
                        <button className="ad-btn ad-btn-danger" style={{ background: '#991b1b' }} onClick={() => {
                            setConfirmDeleteUser(selectedUser)
                        }}><Trash2 size={14} /> Delete</button>
                        <button className="ad-btn ad-btn-secondary" style={{ flex: '0', padding: '12px 16px' }} onClick={() => { closeModal(); }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>
            <div className={'ad-modal-overlay' + (replyModalOpen ? ' ad-modal-open' : '')} onClick={(e) => { if (e.target === e.currentTarget) setReplyModalOpen(false) }}>
                <div className="ad-modal-content" style={{maxWidth:500}}>
                    <div className="ad-modal-hdr">
                        <h3 className="ad-modal-title">Reply to Ticket</h3>
                        <button className="ad-modal-close" onClick={() => setReplyModalOpen(false)}>
                            <X />
                        </button>
                    </div>
                    <div style={{padding:'16px 24px'}}>
                        <textarea
                            className="ad-content-search"
                            style={{width:'100%',minHeight:120,padding:12,resize:'vertical',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'#fff',fontSize:14}}
                            placeholder="Write your reply..."
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                        />
                        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}>
                            <button className="ad-btn ad-btn-secondary" onClick={() => setReplyModalOpen(false)}>Cancel</button>
                            <button className="ad-btn ad-btn-primary" disabled={replySubmitting || !replyMessage.trim()} onClick={handleReplySubmit}>
                                {replySubmitting ? 'Sending...' : 'Send reply'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {profileModalOpen && <ProfileEditModal
                profileForm={profileForm}
                setProfileForm={setProfileForm}
                profileFormLoading={profileFormLoading}
                setProfileFormLoading={setProfileFormLoading}
                profileFormSaving={profileFormSaving}
                setProfileFormSaving={setProfileFormSaving}
                onClose={() => setProfileModalOpen(false)}
                onSaved={() => {
                    apiFetch('/dashboard/admin').then(setData).catch(() => {})
                    apiFetch('/auth/me').then(setProfileData).catch(() => {})
                }}
            />}
            {confirmDeleteUser && (
                <div className="ad-modal-overlay ad-modal-open" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteUser(null) }}>
                    <div className="ad-modal-content" style={{ maxWidth: 420, textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <AlertTriangle size={32} color="#ef4444" />
                        </div>
                        <h3 className="ad-modal-title" style={{ textAlign: 'center', marginBottom: 8 }}>Delete User</h3>
                        <p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                            Are you sure you want to permanently delete <strong style={{ color: '#fff' }}>{confirmDeleteUser.firstName} {confirmDeleteUser.lastName}</strong> ({confirmDeleteUser.email})?<br />
                            <span style={{ color: '#ef4444', fontSize: 13 }}>This action cannot be undone.</span>
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="ad-btn ad-btn-secondary" onClick={() => setConfirmDeleteUser(null)}>Cancel</button>
                            <button className="ad-btn ad-btn-danger" style={{ background: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => {
                                apiFetch('/admin/users/' + confirmDeleteUser.id, { method: 'DELETE' })
                                    .then(() => { showToast('User deleted'); setConfirmDeleteUser(null); closeModal(); fetchUsers(usersPage, usersSearch) })
                                    .catch(err => { swalError(err.message || 'Error'); setConfirmDeleteUser(null) })
                            }}><Trash2 size={14} /> Delete</button>
                        </div>
                    </div>
                </div>
            )}
            {confirmSuspendUser && (
                <div className="ad-modal-overlay ad-modal-open" onClick={(e) => { if (e.target === e.currentTarget) setConfirmSuspendUser(null) }}>
                    <div className="ad-modal-content" style={{ maxWidth: 420, textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <AlertTriangle size={32} color="#f59e0b" />
                        </div>
                        {(() => {
                            const isSuspended = confirmSuspendUser?.status === 'suspended'
                            return (<>
                                <h3 className="ad-modal-title" style={{ textAlign: 'center', marginBottom: 8 }}>{isSuspended ? 'Reactivate' : 'Suspend'} User</h3>
                                <p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                                    Are you sure you want to {isSuspended ? 'reactivate' : 'suspend'} <strong style={{ color: '#fff' }}>{confirmSuspendUser?.firstName} {confirmSuspendUser?.lastName}</strong>?
                                    {isSuspended ? null : <><br /><span style={{ color: '#f59e0b', fontSize: 13 }}>The user will not be able to access the platform.</span></>}
                                </p>
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                    <button className="ad-btn ad-btn-secondary" onClick={() => setConfirmSuspendUser(null)}>Cancel</button>
                                    <button className="ad-btn ad-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => {
                                        const newStatus = isSuspended ? 'active' : 'suspended'
                                        apiFetch('/admin/users/' + confirmSuspendUser.id, { method: 'PUT', body: JSON.stringify({ status: newStatus }) })
                                            .then(() => { showToast('User ' + (newStatus === 'suspended' ? 'suspended' : 'activated')); setConfirmSuspendUser(null); closeModal(); fetchUsers(usersPage, usersSearch) })
                                            .catch(err => { swalError(err.message || 'Error'); setConfirmSuspendUser(null) })
                                    }}>{isSuspended ? 'Reactivate' : 'Suspend'}</button>
                                </div>
                            </>)
                        })()}
                    </div>
                </div>
            )}
        </div>
    )
}

