import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import { Counter } from '../Counter'
import {
    X, Zap, LayoutDashboard, Users, Dumbbell, CalendarDays,
    CreditCard, BarChart3, Video, FileText, Image as ImageIcon,
    MessageCircle, AlertTriangle, Settings, Shield,
    Search, Bell, ChevronDown, AlertCircle, Trash2,
    UserPlus, Download, DollarSign, TrendingUp, ArrowRight,
    Flame, Heart, Target, Ban, LogOut, User,
    Plus, Activity, Award, Star, Ticket, BookOpen,
    Mail, Hash, Megaphone, Utensils, Upload
} from 'lucide-react'
import '../ClientDashboard/ClientDashboard.css'
import ProfileEditModal from '../ProfileModal/ProfileEditModal'
import NotificationsDropdown from '../NotificationsDropdown/NotificationsDropdown'
import ProgramsManager from '../ProgramsManager/ProgramsManager'
import Sidebar from '../Sidebar/Sidebar'
import AdminUsers from './AdminUsers'
import AdminCoaches from './AdminCoaches'
import AdminSubscriptions from './AdminSubscriptions'
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
    { label: 'Live Sessions', icon: CalendarDays },
    { label: 'Billing & Subs', icon: CreditCard },
    { label: 'Plans', icon: Star },
    { label: 'Coupons', icon: Ticket },
    { label: 'Analytics', icon: BarChart3 },
    { section: 'Content' },
    { label: 'Video Library', icon: Video },
    { label: 'Articles', icon: FileText },
    { label: 'Blog', icon: BookOpen },
    { label: 'Exercises', icon: Dumbbell },
    { label: 'Challenges', icon: Flame },
    { label: 'Recipes', icon: Utensils },
    { label: 'Media Assets', icon: ImageIcon },
    { section: 'Support' },
    { label: 'Support Tickets', icon: MessageCircle, badge: 5 },
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

const defaultMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
const defaultBarData = [45, 52, 48, 60, 72, 80, 85, 100]
const defaultBarValues = [320, 385, 356, 445, 534, 593, 630, 742]

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
    const [activeTab, setActiveTab] = useState('Monthly')
    const [countersVisible, setCountersVisible] = useState(false)
    const [barAnimated, setBarAnimated] = useState(false)
    const [ringAnimated, setRingAnimated] = useState(false)
    const [data, setData] = useState(null)
    const [profileData, setProfileData] = useState(null)
    const [profileLoading, setProfileLoading] = useState(false)
    const [articlesData, setArticlesData] = useState([])
    const [allUsers, setAllUsers] = useState([])
    const [usersTotal, setUsersTotal] = useState(0)
    const [usersPage, setUsersPage] = useState(1)
    const [usersSearch, setUsersSearch] = useState('')
    const [activeNav, setActiveNav] = useState('Dashboard')
    const [subscriptionMetrics, setSubscriptionMetrics] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
    const [replyModalOpen, setReplyModalOpen] = useState(false)
    const [replyTicketId, setReplyTicketId] = useState(null)
    const [replyMessage, setReplyMessage] = useState('')
    const [replySubmitting, setReplySubmitting] = useState(false)
    const [liveSessions, setLiveSessions] = useState([])
    const [liveSessionsLoading, setLiveSessionsLoading] = useState(false)
    const [mediaAssets, setMediaAssets] = useState([])
    const [mediaAssetsLoading, setMediaAssetsLoading] = useState(false)
    const [flaggedReports, setFlaggedReports] = useState([])
    const [flaggedReportsLoading, setFlaggedReportsLoading] = useState(false)
    const [platformSettings, setPlatformSettings] = useState([])
    const [platformSettingsLoading, setPlatformSettingsLoading] = useState(false)
    const [auditLogEntries, setAuditLogEntries] = useState([])
    const [confirmDeleteUser, setConfirmDeleteUser] = useState(null)
    const [confirmSuspendUser, setConfirmSuspendUser] = useState(null)

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
                setAllUsers(r.users || [])
                setUsersTotal(r.total || 0)
                setUsersPage(r.page || 1)
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        apiFetch('/dashboard/admin')
            .then(setData)
            .catch(() => showToast('Error loading data'))
            .finally(() => setLoading(false))
        apiFetch('/auth/me')
            .then(u => setUserPhoto(u.photo || ''))
            .catch(() => {})
    }, [showToast])

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
        if (activeNav === 'Live Sessions') {
            setLiveSessionsLoading(true)
            apiFetch('/admin/sessions').then(r => setLiveSessions(r.sessions || r.data || [])).catch(() => {}).finally(() => setLiveSessionsLoading(false))
        } else if (activeNav === 'Articles' || activeNav === 'Blog') {
            apiFetch('/blog').then(r => setArticlesData(r.articles || [])).catch(() => {})
        } else if (activeNav === 'Billing & Subs') {
            apiFetch('/admin/subscriptions/metrics').then(setSubscriptionMetrics).catch(() => {})
        } else if (activeNav === 'Media Assets') {
            setMediaAssetsLoading(true)
            apiFetch('/admin/media').then(r => setMediaAssets(r.assets || r.data || [])).catch(() => {}).finally(() => setMediaAssetsLoading(false))
        } else if (activeNav === 'Flagged Reports') {
            setFlaggedReportsLoading(true)
            apiFetch('/admin/flagged-reports').then(r => setFlaggedReports(r.reports || r.data || [])).catch(() => {}).finally(() => setFlaggedReportsLoading(false))
        } else if (activeNav === 'Configuration') {
            setPlatformSettingsLoading(true)
            apiFetch('/admin/settings').then(r => setPlatformSettings(Array.isArray(r) ? r : (r.data || []))).catch(() => {}).finally(() => setPlatformSettingsLoading(false))
        } else if (activeNav === 'Security & Audit') {
            apiFetch('/admin/audit-log?perPage=10').then(r => setAuditLogEntries(r.logs || [])).catch(() => {})
        }
    }, [activeNav])

    const recentUsers = data?.recentUsers || []
    const tickets = data?.supportTickets || []
    const activities = data?.activities || []
    const months = data?.userGrowth?.months || defaultMonths
    const barData = data?.userGrowth?.barData || defaultBarData
    const barValues = data?.userGrowth?.values || defaultBarValues

    const cursorDotRef = useRef(null)
    const cursorRingRef = useRef(null)
    const cursorPos = useRef({ x: 0, y: 0 })
    const ringPos = useRef({ x: 0, y: 0 })
    const rafRef = useRef(null)

    // ── Custom cursor ──
    useEffect(() => {
        const handleMouse = (e) => {
            cursorPos.current = { x: e.clientX, y: e.clientY }
            if (cursorDotRef.current) {
                cursorDotRef.current.style.left = e.clientX + 'px'
                cursorDotRef.current.style.top = e.clientY + 'px'
            }
        }
        const animate = () => {
            ringPos.current.x += (cursorPos.current.x - ringPos.current.x) * 0.15
            ringPos.current.y += (cursorPos.current.y - ringPos.current.y) * 0.15
            if (cursorRingRef.current) {
                cursorRingRef.current.style.left = ringPos.current.x + 'px'
                cursorRingRef.current.style.top = ringPos.current.y + 'px'
            }
            rafRef.current = requestAnimationFrame(animate)
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

    const handleTabClick = (tab) => {
        setActiveTab(tab)
    }

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
            showToast('Respuesta enviada')
            setReplyModalOpen(false)
            apiFetch('/dashboard/admin').then(setData).catch(() => {})
        } catch (e) {
            showToast(e.message || 'Error al enviar respuesta')
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
                userName={data?.userName || 'Carlos Rodríguez'}
                userSubtitle="SUPER ADMIN"
                avatarUrl={userPhoto || `https://picsum.photos/seed/${data?.admin?.name || 'admin'}/80/80.jpg`}
                role="admin"
                collapsed={sidebarCollapsed}
                onToggle={handleSidebarToggle}
                mobileOpen={sidebarMobileOpen}
                onMobileClose={() => setSidebarMobileOpen(false)}
            />

            {loading && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#0a0a0f'
                }}>
                    <div className="ad-spinner" />
                </div>
            )}

            {/* ═══ MAIN CONTENT ═══ */}
            <main className="ad-main" style={{ marginLeft: sidebarCollapsed ? 64 : 260 }}>
                {activeNav === 'User Management' ? <AdminUsers /> : activeNav === 'Coaches' ? <AdminCoaches /> : activeNav === 'Plans' ? <AdminPlans /> : activeNav === 'Coupons' ? <AdminCoupons /> : activeNav === 'Billing & Subs' ? <AdminSubscriptions /> : activeNav === 'Support Tickets' ? <AdminTickets /> : activeNav === 'Blog' ? <AdminBlog /> : activeNav === 'Messages' ? <AdminMessages /> : activeNav === 'Exercises' ? <AdminExercises /> : activeNav === 'Challenges' ? <AdminChallenges /> : activeNav === 'Recipes' ? <AdminRecipes /> : activeNav === 'Analytics' ? <AdminAnalytics /> : activeNav === 'Forum' ? <AdminForum /> : activeNav === 'Notifications' ? <AdminNotifications /> : activeNav === 'Programs' ? <ProgramsManager role="admin" /> : activeNav === 'Settings' ? <SettingsPanel /> : activeNav === 'User Management' ? (
                    <div className="ad-main-content">
                        <div className="ad-content-header">
                            <h1 className="ad-content-title"><Users size={24} /> User Management</h1>
                            <div className="ad-content-actions">
                                <input className="ad-content-search" placeholder="Search users..." value={usersSearch} onChange={e => { setUsersSearch(e.target.value); fetchUsers(1, e.target.value) }} />
                                <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => {
                                    const email = prompt('Email:')
                                    const pass = prompt('Password (min 8 chars):')
                                    if (!email || !pass) return
                                    apiFetch('/admin/users', { method: 'POST', body: JSON.stringify({ firstName: 'New', lastName: 'User', email, password: pass }) })
                                        .then(() => { showToast('User created'); fetchUsers(usersPage, usersSearch) })
                                        .catch(e => showToast(e.message || 'Error creating user'))
                                }}><UserPlus size={16} /> Add User</button>
                            </div>
                        </div>
                        <div className="ad-dash-card" style={{ margin: '24px' }}>
                            <table className="ad-table">
                                <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {allUsers.length === 0 && Array.from({length: 5}, (_, i) => {
                                        const fallback = data?.recentUsers?.[i]
                                        return fallback ? (
                                            <tr key={fallback.seed} className="ad-user-row" onClick={() => handleUserRowClick(fallback)}>
                                                <td><div className="ad-user-cell"><img loading="lazy" src={'https://picsum.photos/seed/'+fallback.seed+'/40/40.jpg'} alt="" className="ad-user-avatar" /><div className="ad-user-cell-info"><div>{fallback.name}</div><div>{fallback.email}</div></div></div></td>
                                                <td><span className={'ad-tier-label ad-tier-'+(fallback.tierClass||'starter')}>{fallback.tier||'Starter'}</span></td>
                                                <td><span className={'ad-status-badge ad-status-'+(fallback.status==='Active'?'active':'pending')}><span className="ad-status-dot" />{fallback.status}</span></td>
                                                <td><span className="ad-time">{fallback.registered}</span></td>
                                                <td><button className="ad-btn ad-btn-secondary ad-btn-xs" onClick={(e) => { e.stopPropagation(); handleUserRowClick(fallback) }}>View</button></td>
                                            </tr>
                                        ) : null
                                    })}
                                    {allUsers.map(u => (
                                        <tr key={u.id} className="ad-user-row" onClick={() => handleUserRowClick(u)}>
                                            <td><div className="ad-user-cell"><img loading="lazy" src={'https://picsum.photos/seed/user-'+u.id+'/40/40.jpg'} alt="" className="ad-user-avatar" /><div className="ad-user-cell-info"><div>{u.firstName} {u.lastName}</div><div>{u.email}</div></div></div></td>
                                            <td><span className={'ad-tier-label ad-tier-'+(u.role==='admin'?'pro':u.role==='coach'?'elite':'starter')}>{u.role || 'client'}</span></td>
                                            <td><span className={'ad-status-badge ad-status-'+(u.status==='active'?'active':'pending')}><span className="ad-status-dot" />{u.status === 'active' ? 'Active' : u.status === 'suspended' ? 'Suspended' : 'Pending'}</span></td>
                                            <td><span className="ad-time">{u.registered ? new Date(u.registered).toLocaleDateString() : '-'}</span></td>
                                            <td>
                                                <button className="ad-btn ad-btn-secondary ad-btn-xs" style={{marginRight:4}} onClick={(e) => { e.stopPropagation(); handleUserRowClick(u) }}>View</button>
                                                {u.status !== 'suspended' && <button className="ad-btn ad-btn-danger ad-btn-xs" style={{marginRight:4}} onClick={(e) => { e.stopPropagation(); setConfirmSuspendUser(u) }}>Suspend</button>}
                                                <button className="ad-btn ad-btn-danger ad-btn-xs" style={{background:'#991b1b'}} onClick={(e) => { e.stopPropagation(); setConfirmDeleteUser(u) }}><Trash2 size={12} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {usersTotal > 20 && (
                                <div style={{display:'flex',justifyContent:'center',gap:8,padding:16}}>
                                    {Array.from({length: Math.ceil(usersTotal / 20)}, (_, i) => (
                                        <button key={i} className={'ad-btn ad-btn-xs ' + (usersPage === i+1 ? 'ad-btn-primary' : 'ad-btn-secondary')}
                                            onClick={() => fetchUsers(i+1, usersSearch)}>{i+1}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeNav === 'Live Sessions' ? (
                    <div className="ad-main-content">
                        <div className="ad-content-header">
                            <h1 className="ad-content-title"><CalendarDays size={24} /> Live Sessions</h1>
                            <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => showToast('Create a new live session')}><Plus size={16} /> Create Session</button>
                        </div>
                        <div className="ad-section-grid ad-section-grid-2" style={{ padding: '24px' }}>
                            <div className="ad-dash-card">
                                <h3 className="ad-section-title-sm">Today's Sessions</h3>
                                {liveSessionsLoading ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: '#737373' }}>Loading...</div>
                                ) : (
                                <div className="ad-ticket-list" style={{ marginTop: 16 }}>
                                    {liveSessions.filter(s => s.date === new Date().toISOString().slice(0,10)).slice(0,5).map((s, i) => (
                                        <div key={s.id || i} className="ad-ticket-item" style={{ cursor: 'default' }}>
                                            <div className="ad-ticket-top"><span style={{color:'var(--power-500)',fontWeight:600}}>{s.startTime?.slice(0,5) || '09:00'}</span><span className={'ad-status-badge ad-status-'+(s.status==='scheduled'?'pending':'active')}>{s.status}</span></div>
                                            <div className="ad-ticket-desc" style={{fontSize:15,fontWeight:500}}>{s.title}</div>
                                            <div className="ad-ticket-top" style={{marginBottom:0}}><span style={{color:'#737373',fontSize:13}}>{s.trainerName || 'Unassigned'} · {s.type === 'group' ? 'Group' : '1:1'} session</span></div>
                                        </div>
                                    ))}
                                    {liveSessions.filter(s => s.date === new Date().toISOString().slice(0,10)).length === 0 && (
                                        <div style={{ padding: 24, textAlign: 'center', color: '#737373' }}>No sessions scheduled for today</div>
                                    )}
                                </div>
                                )}
                            </div>
                            <div className="ad-dash-card">
                                <h3 className="ad-section-title-sm">Upcoming (Next 7 Days)</h3>
                                {liveSessionsLoading ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: '#737373' }}>Loading...</div>
                                ) : (
                                <div className="ad-ticket-list" style={{ marginTop: 16 }}>
                                    {Array.from({length:7}, (_, di) => {
                                        const d = new Date(); d.setDate(d.getDate() + di)
                                        const dateStr = d.toISOString().slice(0,10)
                                        const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
                                        const count = liveSessions.filter(s => s.date === dateStr).length
                                        return (
                                        <div key={dateStr} className="ad-ticket-item" style={{cursor:'default'}}>
                                            <div className="ad-ticket-top"><span style={{color:'#fff',fontWeight:500}}>{dayName}</span><span style={{color:'#737373',fontSize:13}}>{count} session{count !== 1 ? 's' : ''}</span></div>
                                        </div>
                                    )})}
                                </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : activeNav === 'Billing & Subs' ? (
                    <div className="ad-main-content">
                        <div className="ad-content-header">
                            <h1 className="ad-content-title"><CreditCard size={24} /> Billing & Subscriptions</h1>
                            <button className="ad-btn ad-btn-primary ad-btn-sm"><Download size={16} /> Export Report</button>
                        </div>
                        <div className="ad-kpi-grid" style={{ padding: '0 24px' }}>
                            <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-green"><DollarSign /></div><div className="ad-kpi-value">${(subscriptionMetrics?.mrr || data?.kpis?.monthlyMRR || 0).toLocaleString(undefined, {minimumFractionDigits:0,maximumFractionDigits:0})}</div><div className="ad-kpi-label">Monthly MRR</div></div>
                            <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-blue"><Users /></div><div className="ad-kpi-value">{(subscriptionMetrics?.activeSubscriptions || 0).toLocaleString()}</div><div className="ad-kpi-label">Active Subscribers</div></div>
                            <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-yellow"><TrendingUp /></div><div className="ad-kpi-value">${((subscriptionMetrics?.mrr || 0) * 12).toLocaleString(undefined, {minimumFractionDigits:0,maximumFractionDigits:0})}</div><div className="ad-kpi-label">Annual Run Rate</div></div>
                            <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-purple"><Users /></div><div className="ad-kpi-value">{subscriptionMetrics?.churnRate || 0}%</div><div className="ad-kpi-label">Churn Rate</div></div>
                        </div>
                        <div className="ad-dash-card" style={{ margin: '24px' }}>
                            <table className="ad-table">
                                <thead><tr><th>Plan</th><th>Subscribers</th><th>Monthly Revenue</th><th>% of Total</th></tr></thead>
                                <tbody>
                                    {(subscriptionMetrics?.planBreakdown?.length ? subscriptionMetrics.planBreakdown : data?.subscriptionTiers || []).map(t => (
                                        <tr key={t.name} className="ad-user-row">
                                            <td><span style={{fontWeight:500}}>{t.name}</span></td>
                                            <td>{t.count?.toLocaleString?.() || t.count || 0}</td>
                                            <td>${((t.revenue || (parseInt(String(t.count || '0').replace(/,/g,''), 10) || 0) * 19)).toLocaleString(undefined, {minimumFractionDigits:0,maximumFractionDigits:0})}</td>
                                            <td><span className="ad-tier-bar" style={{display:'inline-flex',alignItems:'center',gap:8}}><span className={'ad-tier-fill ad-'+t.cls} style={{width:48,height:8,borderRadius:4,display:'inline-block'}} />{t.pct || (subscriptionMetrics?.mrr > 0 ? Math.round(t.revenue / subscriptionMetrics.mrr * 100) + '%' : '0%')}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : activeNav === 'Analytics' ? (
                    <div className="ad-main-content">
                        <div className="ad-content-header">
                            <h1 className="ad-content-title"><BarChart3 size={24} /> Analytics</h1>
                            <div className="ad-chart-tabs">
                                {['7 Days','30 Days','90 Days','Custom'].map(tab => (
                                    <button key={tab} className={'ad-chart-tab'+(tab==='30 Days'?' ad-tab-active':'')} onClick={() => showToast('Analytics: ' + tab)}>{tab}</button>
                                ))}
                            </div>
                        </div>
                        <div className="ad-kpi-grid" style={{ padding: '0 24px' }}>
                            <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-blue"><BarChart3 /></div><div className="ad-kpi-value">+23%</div><div className="ad-kpi-label">User Growth</div></div>
                            <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-green"><TrendingUp /></div><div className="ad-kpi-value">87%</div><div className="ad-kpi-label">Retention</div></div>
                            <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-yellow"><Activity /></div><div className="ad-kpi-value">4.2k</div><div className="ad-kpi-label">Daily Active</div></div>
                            <div className="ad-dash-card ad-kpi-card"><div className="ad-kpi-icon-box ad-red"><Target /></div><div className="ad-kpi-value">12.8k</div><div className="ad-kpi-label">Total Workouts</div></div>
                        </div>
                        <div className="ad-section-grid ad-section-grid-2" style={{ padding: '24px' }}>
                            <div className="ad-dash-card">
                                <h3 className="ad-section-title-sm">Page Views & Engagement</h3>
                                <div className="ad-bar-chart" style={{marginTop:24}}>
                                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i) => (
                                        <div key={d} className="ad-bar-col">
                                            <span className="ad-bar-label">{d}</span>
                                            <div className="ad-bar-fill ad-bar-blue" style={{height: (()=>{const v=[60,75,45,80,90,40,30]; return v[i]+'%'})()}} />
                                            <span className="ad-bar-value">{['1.2k','1.8k','980','2.1k','2.4k','850','620'][i]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="ad-dash-card">
                                <h3 className="ad-section-title-sm">Top Content</h3>
                                <div className="ad-prog-list" style={{marginTop:16}}>
                                    {[
                                        {name:'HIIT Inferno',enroll:'2,847 workouts',color:'orange'},
                                        {name:'Strength Foundation',enroll:'1,923 workouts',color:'blue'},
                                        {name:'Yoga Flow',enroll:'1,456 workouts',color:'purple'},
                                        {name:'Nutrition Guide',enroll:'982 views',color:'green'},
                                    ].map((c,i) => (
                                        <div key={i} className="ad-prog-item">
                                            <div className={'ad-prog-icon ad-'+c.color}><Flame /></div>
                                            <div className="ad-prog-info"><div className="ad-prog-name">{c.name}</div><div className="ad-prog-enroll">{c.enroll}</div></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeNav === 'Video Library' ? (
                    <VideoLibrary />
                ) : activeNav === 'Articles' ? (
                    <div className="ad-main-content">
                        <div className="ad-content-header">
                            <h1 className="ad-content-title"><FileText size={24} /> Articles</h1>
                            <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => showToast('New article editor')}><Plus size={16} /> New Article</button>
                        </div>
                        <div className="ad-dash-card" style={{margin:'24px'}}>
                            {articlesData.length === 0 && <div style={{padding:24,textAlign:'center',color:'#737373'}}>No articles found</div>}
                            {articlesData.map((a,i) => (
                                <div key={a.id || i} className="ad-prog-item" style={{borderBottom:'1px solid rgba(255,255,255,.05)',padding:'16px 0',cursor:'pointer'}}>
                                    <div className="ad-prog-info" style={{flex:1}}><div className="ad-prog-name">{a.title}</div><div className="ad-prog-enroll">{a.author_name || 'Admin'} · {a.published_at?.slice(0,10) || 'N/A'}</div></div>
                                    <span className={'ad-status-badge ad-status-'+(a.status==='Published'||a.status==='published'?'active':'pending')} style={{marginRight:16}}>{a.status||'Published'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
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
                                        const res = await fetch('/api/admin/media', { method: 'POST', body: formData, credentials: 'include' });
                                        if (!res.ok) throw new Error('Upload failed');
                                        showToast('File uploaded');
                                        apiFetch('/admin/media').then(r => setMediaAssets(r.assets || r.data || [])).catch(() => {})
                                    } catch (err) { showToast(err.message || 'Error uploading file') }
                                }} />
                                </label>
                            </div>
                        </div>
                        <div className="ad-section-grid" style={{padding:'24px',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))'}}>
                            {mediaAssetsLoading ? (
                                <div style={{gridColumn:'1/-1',padding:32,textAlign:'center',color:'#737373'}}>Loading...</div>
                            ) : mediaAssets.length === 0 ? (
                                <div style={{gridColumn:'1/-1',padding:32,textAlign:'center',color:'#737373'}}>No media assets found. Upload a file to get started.</div>
                            ) : mediaAssets.map((a,i) => (
                                <div key={a.id || i} className="ad-dash-card ad-kpi-card" style={{padding:'12px',cursor:'pointer',aspectRatio:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative'}}>
                                    {a.file_type === 'image' ? (
                                        <img src={'/api/' + a.file_path} alt={a.file_name} style={{width:'100%',height:'60%',objectFit:'cover',borderRadius:6,marginBottom:8}} />
                                    ) : a.file_type === 'video' ? (
                                        <Video size={28} style={{color:'rgba(255,214,0,.4)',marginBottom:8}} />
                                    ) : (
                                        <FileText size={28} style={{color:'rgba(255,214,0,.4)',marginBottom:8}} />
                                    )}
                                    <span style={{fontSize:12,color:'#737373',textAlign:'center',wordBreak:'break-all'}}>{a.file_name}</span>
                                    <button className="ad-btn ad-btn-danger ad-btn-xs" style={{position:'absolute',top:6,right:6,padding:'2px 6px',minWidth:'auto'}} onClick={async () => {
                                        if (!confirm('Delete ' + a.file_name + '?')) return;
                                        try { await apiFetch('/admin/media/' + a.id, { method: 'DELETE' }); showToast('Deleted'); apiFetch('/admin/media').then(r => setMediaAssets(r.assets || r.data || [])).catch(() => {}) }
                                        catch (e) { showToast(e.message || 'Error') }
                                    }}><X size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeNav === 'Support Tickets' ? (
                    <div className="ad-main-content">
                        <div className="ad-content-header">
                            <h1 className="ad-content-title"><MessageCircle size={24} /> Support Tickets</h1>
                            <div className="ad-content-actions"><input className="ad-content-search" placeholder="Search tickets..." onChange={e => {
                                const val = e.target.value
                                apiFetch('/admin/tickets' + (val ? '?search='+encodeURIComponent(val) : ''))
                                    .then(r => setData(prev => ({...prev, supportTickets: Array.isArray(r) ? r : (r?.data || []) })))
                                    .catch(() => {})
                            }} /></div>
                        </div>
                        <div className="ad-dash-card" style={{margin:'24px'}}>
                            {(data?.supportTickets?.length ? data.supportTickets : []).map((t,i) => {
                                const severityClass = t.severity === 'critical' || t.severity === 'Critical' ? 'cancelled' : t.severity === 'resolved' || t.severity === 'closed' ? 'active' : 'pending'
                                return (
                                <div key={t.id || i} className="ad-ticket-item" style={{cursor:'default'}}>
                                    <div className="ad-ticket-top"><div className="ad-ticket-id">{t.id}</div><span className="ad-ticket-time">{t.createdAt ? new Date(t.createdAt).toLocaleString() : t.time}</span></div>
                                    <div className="ad-ticket-desc">{t.desc || t.message || t.subject}</div>
                                    <div className="ad-ticket-top" style={{marginBottom:0}}>
                                        <div className="ad-ticket-user"><span>{t.userName || t.user} {t.assignedTo ? '· Assigned: ' + t.assignedTo : ''}</span></div>
                                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                                            <button className="ad-btn ad-btn-primary ad-btn-xs" onClick={(e) => { e.stopPropagation(); handleReplyOpen(String(t.id).replace('#', '')) }}>Reply</button>
                                            <span className={'ad-status-badge ad-status-'+severityClass}>{t.severity}</span>
                                        </div>
                                    </div>
                                </div>
                            )})}
                            {(!data?.supportTickets?.length) && <div style={{padding:24,textAlign:'center',color:'#737373'}}>No tickets found</div>}
                        </div>
                    </div>
                ) : activeNav === 'Flagged Reports' ? (
                    <div className="ad-main-content">
                        <div className="ad-content-header">
                            <h1 className="ad-content-title"><AlertTriangle size={24} /> Flagged Reports</h1>
                            <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => showToast('Reviewing all flagged content')}><Shield size={16} /> Review All</button>
                        </div>
                        <div className="ad-dash-card" style={{margin:'24px'}}>
                            {flaggedReportsLoading ? (
                                <div style={{padding:24,textAlign:'center',color:'#737373'}}>Loading...</div>
                            ) : flaggedReports.length === 0 ? (
                                <div style={{padding:24,textAlign:'center',color:'#737373'}}>No flagged reports found</div>
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
                                                    catch (e) { showToast(e.message || 'Error') }
                                                }}>Review</button>
                                                <button className="ad-btn ad-btn-secondary ad-btn-xs" onClick={async () => {
                                                    try { await apiFetch('/admin/flagged-reports/' + r.id, { method: 'PUT', body: JSON.stringify({ status: 'dismissed' }) }); showToast('Dismissed'); apiFetch('/admin/flagged-reports').then(r2 => setFlaggedReports(r2.reports || r2.data || [])).catch(() => {}) }
                                                    catch (e) { showToast(e.message || 'Error') }
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
                            <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={async () => {
                                const updated = {}
                                document.querySelectorAll('[data-setting-key]').forEach(el => {
                                    const key = el.getAttribute('data-setting-key')
                                    const input = el.querySelector('input, select')
                                    if (input) updated[key] = input.value
                                })
                                if (Object.keys(updated).length === 0) return
                                try { await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(updated) }); showToast('Settings saved') }
                                catch (e) { showToast(e.message || 'Error saving settings') }
                            }}><Download size={16} /> Save Changes</button>
                        </div>
                        <div className="ad-section-grid ad-section-grid-2" style={{padding:'24px'}}>
                            {platformSettingsLoading ? (
                                <div style={{gridColumn:'1/-1',padding:32,textAlign:'center',color:'#737373'}}>Loading...</div>
                            ) : (
                                ['General', 'Limits'].map(section => (
                                <div key={section} className="ad-dash-card">
                                    <h3 className="ad-section-title-sm">{section === 'General' ? 'General Settings' : 'Platform Limits'}</h3>
                                    <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:16}}>
                                        {platformSettings.filter(s => section === 'General' ? ['platform_name','support_email','default_language','timezone'].includes(s.key) : ['max_users','max_storage_gb','api_rate_limit','file_upload_max_mb'].includes(s.key)).map(s => (
                                            <div key={s.key} data-setting-key={s.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                                                <span style={{color:'#a3a3a3',fontSize:13}}>{s.description || s.key}</span>
                                                {s.key === 'default_language' ? (
                                                    <select className="ad-content-search" style={{width:'auto',minWidth:120,padding:'4px 8px',fontSize:13}} defaultValue={s.value}>
                                                        <option value="es">Español</option>
                                                        <option value="en">English (US)</option>
                                                        <option value="pt">Português</option>
                                                        <option value="fr">Français</option>
                                                    </select>
                                                ) : (
                                                    <input className="ad-content-search" style={{width:'auto',maxWidth:180,padding:'4px 8px',fontSize:13,textAlign:'right'}} defaultValue={s.value} />
                                                )}
                                            </div>
                                        ))}
                                        {platformSettings.filter(s => section === 'General' ? ['platform_name','support_email','default_language','timezone'].includes(s.key) : ['max_users','max_storage_gb','api_rate_limit','file_upload_max_mb'].includes(s.key)).length === 0 && (
                                            <div style={{color:'#737373',fontSize:13,textAlign:'center',padding:16}}>No settings available</div>
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
                            <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => showToast('Audit log export started')}><Download size={16} /> Export Audit Log</button>
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
                                                        <img src={profileData.photo} alt="" />
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
                            <div className="ad-search-wrap">
                                <Search className="ad-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search users, programs, tickets, logs..."
                                    className="ad-search-input"
                                />
                            </div>
                        </div>
                        <div className="ad-header-right">
                            <button
                                ref={notifBtnRef}
                                className="ad-notif-btn"
                                onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen) }}
                            >
                                <Bell />
                                <span className="ad-notif-badge">5</span>
                            </button>
                            <div className="ad-header-divider" />
                            <button onClick={() => setProfileModalOpen(true)} className="ad-header-profile">
                                <img loading="lazy" 
                                    src={userPhoto || 'https://picsum.photos/seed/admin/80/80.jpg'}
                                    alt="Admin"
                                    className="ad-header-avatar"
                                />
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
                        {/* ═══ WELCOME + KPI CARDS ═══ */}
                        <section className="ad-welcome-wrap ad-fade-in-up">
                            <div className="ad-dash-card ad-welcome-card">
                                <div>
                                    <p className="ad-welcome-label">Admin Control Panel</p>
                                    <h1 className="ad-welcome-title">Welcome back, {(data?.userName || 'Admin').split(' ')[0]} 👋</h1>
                                    <p className="ad-welcome-desc">
                                        Platform currently tracking <span className="ad-highlight-yellow"><strong>{(data?.kpis?.activeUsers || 2847).toLocaleString()} active users</strong></span>.{' '}
                                        Monthly MRR is{' '}
                                        <span className="ad-highlight-green"><strong>${(data?.kpis?.monthlyMRR || 47250).toLocaleString()}</strong></span> with a retention rate of {data?.kpis?.retentionRate || 89}%.
                                    </p>
                                </div>
                                <div className="ad-welcome-actions">
                                    <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => showToast('Export initiated — report will be emailed to you')}>
                                        <Download /> Export Report
                                    </button>
                                    <button className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => setActiveNav('Programs')}>
                                        <Users /> Manage Programs
                                    </button>
                                </div>
                            </div>

                            <div className="ad-kpi-grid">
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-blue"><Users /></div>
                                    <div className="ad-kpi-value"><Counter target={data?.kpis?.activeUsers || 2847} visible={countersVisible} /></div>
                                    <div className="ad-kpi-label">Active Users</div>
                                </div>
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-green"><DollarSign /></div>
                                    <div className="ad-kpi-value">$<Counter target={data?.kpis?.monthlyMRR || 47250} visible={countersVisible} /></div>
                                    <div className="ad-kpi-label">Monthly MRR</div>
                                </div>
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-yellow"><TrendingUp /></div>
                                    <div className="ad-kpi-value">{data?.kpis?.retentionRate || 89}<span className="ad-kpi-label" style={{ fontSize: '16px', display: 'inline', margin: 0 }}>%</span></div>
                                    <div className="ad-kpi-label">Retention Rate</div>
                                </div>
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-red"><AlertCircle /></div>
                                    <div className="ad-kpi-value ad-kpi-red">{data?.kpis?.openTickets || 5}</div>
                                    <div className="ad-kpi-label">Open Tickets</div>
                                </div>
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-purple"><Shield /></div>
                                    <div className="ad-kpi-value">{data?.security?.score || 'A+'}</div>
                                    <div className="ad-kpi-label">Security Score</div>
                                </div>
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-blue"><Target /></div>
                                    <div className="ad-kpi-value">{data?.infrastructure?.[1]?.value || '0%'}</div>
                                    <div className="ad-kpi-label">Subscription Rate</div>
                                </div>
                                <div className="ad-dash-card ad-kpi-card">
                                    <div className="ad-kpi-icon-box ad-green"><Award /></div>
                                    <div className="ad-kpi-value">{data?.infrastructure?.[3]?.value || '100%'}</div>
                                    <div className="ad-kpi-label">Coach Approval</div>
                                </div>
                            </div>
                        </section>

                        {/* ═══ USER GROWTH + SUBSCRIPTION BREAKDOWN ═══ */}
                        <section className="ad-section-grid ad-section-grid-5 ad-fade-in-up-d1">
                            <div className="lg:col-span-3 ad-dash-card">
                                <div className="ad-section-header">
                                    <h3 className="ad-section-title">User Acquisition</h3>
                                    <div className="ad-chart-tabs">
                                        {['Monthly', 'Weekly', 'Daily'].map(tab => (
                                            <button
                                                key={tab}
                                                className={'ad-chart-tab' + (activeTab === tab ? ' ad-tab-active' : '')}
                                                onClick={() => handleTabClick(tab)}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="ad-bar-chart">
                                    {months.map((m, i) => (
                                        <div key={m} className="ad-bar-col">
                                            <span className="ad-bar-label">{m}</span>
                                            <div
                                                className={'ad-bar-fill' + (i === 7 ? ' ad-bar-yellow' : ' ad-bar-blue')}
                                                style={{ height: barAnimated ? barData[i] + '%' : '0%' }}
                                            />
                                            <span className={i === 7 ? 'ad-bar-value-highlight' : 'ad-bar-value'}>
                                                {barValues[i]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
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
                                                strokeDashoffset={ringAnimated ? 66 : 264}
                                            />
                                        </svg>
                                        <div className="ad-donut-center">
                                            <span className="ad-donut-pct">{data?.subscriptionTiers?.length ? Math.round(data.subscriptionTiers.reduce((s, t) => s + parseInt((t.count || '0').replace(/,/g, ''), 10), 0) / 100 * 75) + '%' : '75%'}</span>
                                        </div>
                                    </div>
                                    <div className="ad-donut-info">
                                        <h4>{data?.subscriptionTiers?.reduce((s, t) => s + parseInt((t.count || '0').replace(/,/g, ''), 10), 0)?.toLocaleString() || '2,134'}</h4>
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
                                    <span className="ad-revenue-growth">+15% MoM</span>
                                </div>
                                <div className="ad-revenue-total">
                                    <div className="ad-revenue-amount">${(data?.kpis?.monthlyMRR || 47250).toLocaleString()}</div>
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
                                            <span className={'ad-prog-change' + (p.up !== false ? ' ad-up' : ' ad-down')}>
                                                {p.change}
                                            </span>
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
                                    <div className="ad-infra-meta">Last deployment: 5 days ago · Uptime: 99.97%</div>
                                    <button className="ad-infra-link" onClick={() => showToast('Server logs available in the admin panel')}>
                                        View Server Logs & APM →
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
                                                        <img loading="lazy" 
                                                            src={'https://picsum.photos/seed/' + u.seed + '/40/40.jpg'}
                                                            alt={u.name}
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
                                                    <img loading="lazy" 
                                                        src={'https://picsum.photos/seed/' + t.seed + '/30/30.jpg'}
                                                        alt={t.user}
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
                                <button className="ad-activity-export" onClick={() => showToast('Log export started — file will download shortly')}>
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
                        <img loading="lazy" 
                            src={'https://picsum.photos/seed/' + (selectedUser?.id || 'user') + '/80/80.jpg'}
                            alt={selectedUser?.firstName || 'User'}
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
                        <button className="ad-btn ad-btn-secondary" onClick={() => {
                            const newRole = prompt('New role (admin/coach/client):', selectedUser?.role || 'client')
                            if (newRole && ['admin','coach','client'].includes(newRole)) {
                                apiFetch('/admin/users/' + selectedUser?.id, { method: 'PUT', body: JSON.stringify({ role: newRole }) })
                                    .then(() => { showToast('Role updated'); fetchUsers(usersPage, usersSearch) })
                            }
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
                            placeholder="Escribe tu respuesta..."
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                        />
                        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}>
                            <button className="ad-btn ad-btn-secondary" onClick={() => setReplyModalOpen(false)}>Cancel</button>
                            <button className="ad-btn ad-btn-primary" disabled={replySubmitting || !replyMessage.trim()} onClick={handleReplySubmit}>
                                {replySubmitting ? 'Enviando...' : 'Enviar respuesta'}
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
                        <h3 className="ad-modal-title" style={{ textAlign: 'center', marginBottom: 8 }}>Eliminar usuario</h3>
                        <p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                            ¿Eliminar permanentemente a <strong style={{ color: '#fff' }}>{confirmDeleteUser.firstName} {confirmDeleteUser.lastName}</strong> ({confirmDeleteUser.email})?<br />
                            <span style={{ color: '#ef4444', fontSize: 13 }}>Esta acción no se puede deshacer.</span>
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="ad-btn ad-btn-secondary" onClick={() => setConfirmDeleteUser(null)}>Cancelar</button>
                            <button className="ad-btn ad-btn-danger" style={{ background: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => {
                                apiFetch('/admin/users/' + confirmDeleteUser.id, { method: 'DELETE' })
                                    .then(() => { showToast('User deleted'); setConfirmDeleteUser(null); closeModal(); fetchUsers(usersPage, usersSearch) })
                                    .catch(err => { showToast(err.message || 'Error'); setConfirmDeleteUser(null) })
                            }}><Trash2 size={14} /> Eliminar</button>
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
                                <h3 className="ad-modal-title" style={{ textAlign: 'center', marginBottom: 8 }}>{isSuspended ? 'Reactivar' : 'Suspender'} usuario</h3>
                                <p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                                    ¿{isSuspended ? 'Reactivar' : 'Suspender'} a <strong style={{ color: '#fff' }}>{confirmSuspendUser?.firstName} {confirmSuspendUser?.lastName}</strong>?
                                    {isSuspended ? null : <><br /><span style={{ color: '#f59e0b', fontSize: 13 }}>El usuario no podrá acceder a la plataforma.</span></>}
                                </p>
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                    <button className="ad-btn ad-btn-secondary" onClick={() => setConfirmSuspendUser(null)}>Cancelar</button>
                                    <button className="ad-btn ad-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => {
                                        const newStatus = isSuspended ? 'active' : 'suspended'
                                        apiFetch('/admin/users/' + confirmSuspendUser.id, { method: 'PUT', body: JSON.stringify({ status: newStatus }) })
                                            .then(() => { showToast('User ' + (newStatus === 'suspended' ? 'suspended' : 'activated')); setConfirmSuspendUser(null); closeModal(); fetchUsers(usersPage, usersSearch) })
                                            .catch(err => { showToast(err.message || 'Error'); setConfirmSuspendUser(null) })
                                    }}>{isSuspended ? 'Reactivar' : 'Suspender'}</button>
                                </div>
                            </>)
                        })()}
                    </div>
                </div>
            )}
        </div>
    )
}
