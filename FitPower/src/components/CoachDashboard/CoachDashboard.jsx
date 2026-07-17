import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import {
    Zap, X, LayoutDashboard, CalendarDays, Users, Dumbbell,
    ClipboardList, BarChart3, MessageCircle, Video, FileText,
    Wallet, Star, Settings, Search, Bell, ChevronDown,
    CalendarCheck, ChevronRight, Plus, TrendingUp,
    Flame, Heart, UserX, LogOut, User,
    Download, DollarSign, Activity, Clock
} from 'lucide-react'
import CoachProfilePage from './CoachProfilePage'
import NotificationsDropdown from '../NotificationsDropdown/NotificationsDropdown'
import ProgramsManager from '../ProgramsManager/ProgramsManager'
import ChatMessenger from '../ChatMessenger/ChatMessenger'
import CoachCalendar from '../CoachCalendar/CoachCalendar'
import WorkoutBuilder from '../WorkoutBuilder/WorkoutBuilder'
import LiveSessions from '../LiveSessions/LiveSessions'
import Sidebar from '../Sidebar/Sidebar'
import '../DashboardShared.css'
import './CoachDashboard.css'
import { Counter } from '../Counter'
import DriverTour from '../DriverTour/DriverTour'
import ClientList from '../ClientList/ClientList'
import ClientCheckins from './ClientCheckins'
import ClientMetrics from './ClientMetrics'
import ClientPhotos from './ClientPhotos'
import ClientNutrition from './ClientNutrition'
import AssignRoutine from './AssignRoutine'
import ClientDailySummary from './ClientDailySummary'
import ClientNotesPanel from './ClientNotesPanel'
import CoachTrainingVideos from './CoachTrainingVideos'
import SettingsPanel from '../Settings/Settings'

const defaultWeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const defaultWeekData = [75, 100, 50, 100, 75, 8, 8]
const defaultWeekValues = [3, 4, 2, 4, 3, 2, 0]

const StarRating = ({ filled }) => (
    <div className="cd-fb-stars">
        {[0, 1, 2, 3, 4].map(i => (
            <Star key={i} className={'cd-fb-star' + (i < filled ? '' : ' cd-dim')} />
        ))}
    </div>
)

export default function CoachDashboard() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const { logout: authLogout } = useAuth()
    const [notifOpen, setNotifOpen] = useState(false)
    const [clientModalOpen, setClientModalOpen] = useState(false)
    const [selectedClient, setSelectedClient] = useState(null)
    const [activeNav, setActiveNav] = useState('Dashboard')
    const [countersVisible, setCountersVisible] = useState(false)
    const [barAnimated, setBarAnimated] = useState(false)
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
    const [userPhoto, setUserPhoto] = useState('')
    const [selectedClientId, setSelectedClientId] = useState(null)
    const [clientView, setClientView] = useState(null)
    const [unreadCount, setUnreadCount] = useState(0)
    const [analyticsDays, setAnalyticsDays] = useState(30)
    const [analyticsLoading, setAnalyticsLoading] = useState(false)
    const [notesClientId, setNotesClientId] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchOpen, setSearchOpen] = useState(false)

    useEffect(() => {
        const onResize = () => { if (window.innerWidth > 1024) setSidebarMobileOpen(false) }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    useEffect(() => {
        if (activeNav === 'Messages') {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [activeNav])

    const handleSidebarToggle = useCallback(() => {
        if (window.innerWidth <= 1024) {
            setSidebarMobileOpen(o => !o)
        } else {
            setSidebarCollapsed(c => !c)
        }
    }, [])
    const notifRef = useRef(null)
    const notifBtnRef = useRef(null)

    useEffect(() => {
        apiFetch('/dashboard/coach')
            .then(setData)
            .catch(() => showToast('Error loading data'))
            .finally(() => setLoading(false))
        apiFetch('/auth/me')
            .then(u => setUserPhoto(u.photo || ''))
            .catch(() => {})
        apiFetch('/notifications?unread=true')
            .then(n => setUnreadCount(Array.isArray(n) ? n.length : 0))
            .catch(() => {})
    }, [showToast])

    const fetchAnalytics = useCallback((days) => {
        setAnalyticsDays(days)
        setAnalyticsLoading(true)
        apiFetch(`/dashboard/coach?days=${days}`)
            .then(setData)
            .catch(() => showToast('Error loading analytics'))
            .finally(() => setAnalyticsLoading(false))
    }, [showToast])

    const exportEarningsCSV = useCallback(() => {
        if (!data?.earnings) return
        const rows = [['Category', 'Amount', 'Percentage']]
        ;(data.earnings.breakdown || []).forEach(e => {
            rows.push([e.label, e.value, e.pct + '%'])
        })
        rows.push([])
        rows.push(['Total', data.earnings.total, ''])
        rows.push(['Growth', data.earnings.growth, ''])
        rows.push(['Pending Payout', data.earnings.pendingPayout, ''])
        rows.push([])
        rows.push(['Recent Payouts'])
        rows.push(['Date', 'Amount', 'Status'])
        ;(data.recentPayouts || []).forEach(p => {
            rows.push([p.date, p.amount, p.status])
        })
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `fitpower-earnings-${new Date().toISOString().slice(0,10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        showToast('Earnings exported')
    }, [data, showToast])

    const sessions = data?.sessions?.length ? data.sessions : []
    const weekDays = data?.weeklyVolume?.days || defaultWeekDays
    const weekData = data?.weeklyVolume?.data || defaultWeekData
    const weekValues = data?.weeklyVolume?.values || defaultWeekValues

    const searchResults = searchQuery.trim().length >= 2 ? (() => {
        const q = searchQuery.toLowerCase()
        const results = []
        ;(data?.clientRoster || []).forEach(c => {
            if (c.name?.toLowerCase().includes(q) || c.prog?.toLowerCase().includes(q)) {
                results.push({ type: 'client', label: c.name, sub: c.prog || 'No program', nav: 'My Clients' })
            }
        })
        ;(data?.programs || []).forEach(p => {
            if (p.name?.toLowerCase().includes(q) || p.detail?.toLowerCase().includes(q)) {
                results.push({ type: 'program', label: p.name, sub: p.detail, nav: 'Programs' })
            }
        })
        ;(data?.sessions || []).forEach(s => {
            if (s.name?.toLowerCase().includes(q) || s.detail?.toLowerCase().includes(q)) {
                results.push({ type: 'session', label: s.name, sub: `${s.time} ${s.ampm} — ${s.detail || ''}`, nav: 'My Schedule' })
            }
        })
        return results.slice(0, 8)
    })() : []

    const cursorDotRef = useRef(null)
    const cursorRingRef = useRef(null)
    const cursorPos = useRef({ x: 0, y: 0 })
    const ringPos = useRef({ x: 0, y: 0 })
    const rafRef = useRef(null)

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

        const hoverTargets = document.querySelectorAll('.coach-dashboard a, .coach-dashboard button, .coach-dashboard input, .cd-nav-item, .cd-session-card, .cd-client-row, .cd-notif-item, .cd-prog-item, .cd-modal-overlay, .cd-card, .cd-roster td')
        const addHover = () => {
            if (cursorDotRef.current) cursorDotRef.current.classList.add('cd-hover')
            if (cursorRingRef.current) cursorRingRef.current.classList.add('cd-hover')
        }
        const removeHover = () => {
            if (cursorDotRef.current) cursorDotRef.current.classList.remove('cd-hover')
            if (cursorRingRef.current) cursorRingRef.current.classList.remove('cd-hover')
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

    useEffect(() => {
        const t = setTimeout(() => setCountersVisible(true), 300)
        return () => clearTimeout(t)
    }, [])

    useEffect(() => {
        const t = setTimeout(() => setBarAnimated(true), 500)
        return () => clearTimeout(t)
    }, [])

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

    const handleNavClick = (label) => {
        if (label === 'Log Out') {
            authLogout()
            navigate('/login')
            return
        }
        if (label === 'Profile') {
            setActiveNav('Profile')
            return
        }
        setActiveNav(label)
    }

    return (
        <div className="coach-dashboard cd-grid-bg cd-noise">
            <div className="cd-cursor-dot" ref={cursorDotRef} />
            <div className="cd-cursor-ring" ref={cursorRingRef} />

            <Sidebar
                items={[
                    { section: 'Overview' },
                    { label: 'Dashboard', icon: LayoutDashboard, active: true },
                    { label: 'My Schedule', icon: CalendarDays },
                    { label: 'My Clients', icon: Users },
                    { label: 'Programs', icon: Dumbbell },
                    { label: 'Workout Builder', icon: ClipboardList },
                    { label: 'Client Analytics', icon: BarChart3 },
                    { section: 'Communication' },
                    { label: 'Messages', icon: MessageCircle, badge: unreadCount || undefined },
                    { label: 'Live Sessions', icon: Video },
                    { label: 'Client Notes', icon: FileText },
                    { label: 'Training Videos', icon: Video },
                    { section: 'Account' },
                    { label: 'Profile', icon: User },
                    { label: 'Earnings', icon: Wallet },
                    { label: 'Reviews', icon: Star },
                    { label: 'Settings', icon: Settings },
                    { label: 'Log Out', icon: LogOut },
                ]}
                activeNav={activeNav}
                onNavClick={handleNavClick}
                userName={data?.userName || 'Coach'}
                avatarUrl={userPhoto || ''}
                role="coach"
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
                    <div className="cd-spinner" />
                </div>
            )}

            {/* ═══ MAIN ═══ */}
            <main className="cd-main" style={{ marginLeft: sidebarCollapsed ? 64 : 260 }}>
                {activeNav === 'Programs' ? <ProgramsManager role="coach" /> : activeNav === 'Messages' ? (
                    <div className={`cd-messages-view ${sidebarCollapsed ? 'cd-messages-collapsed' : ''}`}>
                        <ChatMessenger />
                    </div>
                ) : activeNav === 'My Schedule' ? <CoachCalendar /> : activeNav === 'Workout Builder' ? <WorkoutBuilder /> : activeNav === 'My Clients' ? (
                    clientView && selectedClientId ? (
                        <div className="cd-main-content" style={{padding:'24px'}}>
                            <div className="cd-content-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
                                <h1 style={{fontSize:24,fontWeight:700,display:'flex',alignItems:'center',gap:12}}><Users size={24} style={{color:'var(--power-500)'}} /> Client Details</h1>
                                <button className="cd-btn cd-btn-secondary cd-btn-sm" onClick={() => { setClientView(null); setSelectedClientId(null) }}>← Back to Clients</button>
                            </div>
                            <div className="cd-grid-5" style={{marginBottom:24}}>
                                {['daily-summary','checkins','metrics','photos','nutrition','routines'].map(view => (
                                    <button key={view} className={'cd-btn ' + (clientView === view ? 'cd-btn-primary' : 'cd-btn-outline') + ' cd-btn-sm'} onClick={() => setClientView(view)} style={{textTransform:'capitalize'}}>
                                        {view === 'daily-summary' ? 'Daily Summary' : view}
                                    </button>
                                ))}
                            </div>
                            {clientView === 'daily-summary' && <ClientDailySummary clientId={selectedClientId} />}
                            {clientView === 'checkins' && <ClientCheckins clientId={selectedClientId} />}
                            {clientView === 'metrics' && <ClientMetrics clientId={selectedClientId} />}
                            {clientView === 'photos' && <ClientPhotos clientId={selectedClientId} />}
                            {clientView === 'nutrition' && <ClientNutrition clientId={selectedClientId} />}
                            {clientView === 'routines' && <AssignRoutine clientId={selectedClientId} />}
                        </div>
                    ) : (
                        <ClientList onSelectClient={(id) => { setSelectedClientId(id); setClientView('daily-summary') }} />
                    )
                ) : activeNav === 'Profile' ? <CoachProfilePage /> : activeNav === 'Settings' ? <SettingsPanel compact /> : activeNav === 'Client Analytics' ? (
                    <div className="cd-main-content" style={{padding:'24px'}}>
                        <div className="cd-content-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
                            <h1 style={{fontSize:24,fontWeight:700,display:'flex',alignItems:'center',gap:12}}><BarChart3 size={24} style={{color:'var(--power-500)'}} /> Client Analytics</h1>
                            <div className="ad-chart-tabs">
                                {[7,30,90].map(days => (
                                    <button key={days} className={'ad-chart-tab'+(analyticsDays===days?' ad-tab-active':'')} onClick={() => fetchAnalytics(days)}>{days} Days</button>
                                ))}
                            </div>
                        </div>
                        <div className="cd-grid-3" style={{marginBottom:24, opacity: analyticsLoading ? 0.5 : 1, transition: 'opacity .3s'}}>
                            <div className="cd-card cd-kpi-card"><div className="cd-kpi-icon-box cd-blue"><BarChart3 /></div><div className="cd-kpi-value">{data?.kpis?.activeClients||0}</div><div className="cd-kpi-label">Total Clients</div></div>
                            <div className="cd-card cd-kpi-card"><div className="cd-kpi-icon-box cd-green"><TrendingUp /></div><div className="cd-kpi-value">{data?.kpis?.completionRate||0}%</div><div className="cd-kpi-label">Avg Completion</div></div>
                            <div className="cd-card cd-kpi-card"><div className="cd-kpi-icon-box cd-yellow"><Activity /></div><div className="cd-kpi-value">{data?.weeklyVolume?.total||0}</div><div className="cd-kpi-label">Sessions/Week</div></div>
                        </div>
                        <div className="cd-grid-2">
                            <div className="cd-card">
                                <h3 className="cd-section-title-sm">Weekly Volume</h3>
                                <div className="cd-weekly-bar-chart" style={{marginTop:16}}>
                                    {(data?.weeklyVolume?.days||['Mon','Tue','Wed','Thu','Fri','Sat','Sun']).map((d,i)=>(
                                        <div key={d} className="cd-bar-col">
                                            <span className="cd-day-label">{d}</span>
                                            <div className="cd-bar-fill cd-bar-yellow" style={{height:(data?.weeklyVolume?.data||[0,0,0,0,0,0,0])[i]+'%'}} />
                                            <span className="cd-bar-value">{(data?.weeklyVolume?.values||[0,0,0,0,0,0,0])[i]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="cd-card">
                                <h3 className="cd-section-title-sm">Client Progress Overview</h3>
                                <div className="cd-client-progress" style={{marginTop:16}}>
                                    {(data?.clientProgress||[]).slice(0,5).map((c,i)=>(
                                        <div key={i} className="cd-client-row">
                                            {c.photo ? <img loading="lazy" src={c.photo} alt="" className="cd-client-avatar" /> : <div className="cd-client-avatar cd-avatar-placeholder-sm">{(c.name||'?')[0]}</div>}
                                            <div className="cd-client-body">
                                                <div className="cd-client-hdr"><span className="cd-client-name">{c.name}</span><span className={'cd-client-count cd-'+c.countCls}>{c.count}</span></div>
                                                <div className="cd-progress-bar"><div className={'cd-progress-fill cd-'+c.barCls} style={{width:c.pct+'%'}} /></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeNav === 'Live Sessions' ? (
                    <LiveSessions role="coach" />
                ) : activeNav === 'Client Notes' ? (
                    <ClientNotesPanel selectedClientId={notesClientId} onSelectClient={setNotesClientId} />
                ) : activeNav === 'Training Videos' ? (
                    <CoachTrainingVideos />
                ) : activeNav === 'Earnings' ? (
                    <div className="cd-main-content" style={{padding:'24px'}}>
                        <div className="cd-content-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
                            <h1 style={{fontSize:24,fontWeight:700,display:'flex',alignItems:'center',gap:12}}><Wallet size={24} style={{color:'var(--power-500)'}} /> Earnings</h1>
                            <button className="cd-btn cd-btn-secondary cd-btn-sm" onClick={exportEarningsCSV}><Download size={16} /> Export</button>
                        </div>
                        <div className="cd-grid-3" style={{marginBottom:24}}>
                            <div className="cd-card cd-kpi-card"><div className="cd-kpi-icon-box cd-green"><DollarSign /></div><div className="cd-kpi-value">{data?.earnings?.total||'$0'}</div><div className="cd-kpi-label">Total Earnings</div></div>
                            <div className="cd-card cd-kpi-card"><div className="cd-kpi-icon-box cd-yellow"><TrendingUp /></div><div className="cd-kpi-value">{data?.earnings?.growth||''}</div><div className="cd-kpi-label">Growth MoM</div></div>
                            <div className="cd-card cd-kpi-card"><div className="cd-kpi-icon-box cd-blue"><Clock /></div><div className="cd-kpi-value">{data?.earnings?.pendingPayout||'$0'}</div><div className="cd-kpi-label">Pending Payout</div></div>
                        </div>
                        <div className="cd-card">
                            <h3 className="cd-section-title-sm">Earnings Breakdown</h3>
                            <div className="cd-earnings-list" style={{marginTop:16}}>
                                    {(data?.earnings?.breakdown || []).map(e=>(
                                    <div key={e.label} className="cd-earn-row">
                                        <div className="cd-earn-hdr"><span className="cd-earn-label">{e.label}</span><span className="cd-earn-value">{e.value}</span></div>
                                        <div className="cd-earn-bar"><div className={'cd-earn-fill cd-'+e.cls} style={{width:e.pct+'%'}} /></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="cd-card" style={{marginTop:16}}>
                            <h3 className="cd-section-title-sm">Recent Payouts</h3>
                            <table className="cd-earnings-table" style={{width:'100%',marginTop:16}}>
                                <thead><tr><th style={{textAlign:'left',padding:'8px 16px',color:'#737373',fontSize:12}}>Date</th><th style={{textAlign:'left',padding:'8px 16px',color:'#737373',fontSize:12}}>Amount</th><th style={{textAlign:'left',padding:'8px 16px',color:'#737373',fontSize:12}}>Status</th></tr></thead>
                                <tbody>
                                    {(data?.recentPayouts || []).map((p,i)=>(
                                        <tr key={i} className="cd-user-row" style={{borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                                            <td style={{padding:'12px 16px'}}>{p.date}</td>
                                            <td style={{padding:'12px 16px',fontWeight:600}}>{p.amount}</td>
                                            <td style={{padding:'12px 16px'}}><span className="cd-badge cd-badge-done">{p.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : activeNav === 'Reviews' ? (
                    <div className="cd-main-content" style={{padding:'24px'}}>
                        <div className="cd-content-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
                            <h1 style={{fontSize:24,fontWeight:700,display:'flex',alignItems:'center',gap:12}}><Star size={24} style={{color:'var(--power-500)'}} /> Reviews</h1>
                            <div style={{display:'flex',alignItems:'center',gap:16}}>
                                <span style={{color:'#737373',fontSize:14}}>Avg Rating: <strong style={{color:'var(--power-500)',fontSize:20}}>{data?.kpis?.avgRating||0}</strong>/5.0</span>
                            </div>
                        </div>
                        <div className="cd-card" style={{padding:0,overflow:'hidden'}}>
                            {(data?.reviews || []).map((r,i)=>(
                                <div key={i} style={{padding:'20px',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                                            {r.photo ? <img loading="lazy" src={r.photo} alt="" style={{width:40,height:40,borderRadius:'50%'}} /> : <div style={{width:40,height:40,borderRadius:'50%',background:'var(--power-500)',color:'#000',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:16}}>{(r.name||'?')[0]}</div>}
                                            <div><div style={{fontWeight:600}}>{r.name}</div><div style={{display:'flex',gap:2}}>{Array.from({length:5},(_,j)=>j<r.rating?<Star key={j} size={14} style={{fill:'var(--power-500)',color:'var(--power-500)'}} />:<Star key={j} size={14} style={{color:'#525252'}} />)}</div></div>
                                        </div>
                                        <span style={{color:'#737373',fontSize:13}}>{r.date}</span>
                                    </div>
                                    <p style={{color:'#d4d4d4',fontSize:14,lineHeight:1.6,marginBottom:8}}>{r.text}</p>
                                    <div style={{display:'flex',gap:4}}>{r.tags.map(t=><span key={t} style={{padding:'2px 8px',borderRadius:4,background:'rgba(255,214,0,.1)',color:'var(--power-500)',fontSize:11,fontWeight:600}}>{t}</span>)}</div>
                                </div>
                            ))}
                            {(!data?.reviews?.length) && <p style={{color:'#737373',textAlign:'center',padding:'40px 20px'}}>No reviews yet</p>}
                        </div>
                    </div>
                ) : (
                    <>
                <header className="cd-header">
                    <div className="cd-header-inner">
                        <div className="cd-header-left">
                            <div className="cd-search-wrap" style={{position:'relative'}}>
                                <Search className="cd-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search clients, programs, sessions..."
                                    className="cd-search-input"
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
                                    onFocus={() => setSearchOpen(true)}
                                    onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                                />
                                {searchOpen && searchResults.length > 0 && (
                                    <div className="cd-search-dropdown">
                                        {searchResults.map((r, i) => (
                                            <div
                                                key={i}
                                                className="cd-search-result"
                                                onClick={() => { setActiveNav(r.nav); setSearchQuery(''); setSearchOpen(false) }}
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
                                {searchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                                    <div className="cd-search-dropdown">
                                        <div className="cd-search-empty">No results found</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="cd-header-right">
                            <button className="cd-go-live" onClick={() => showToast('Live session setup — feature coming soon')}>
                                <span className="cd-live-dot" /> GO LIVE
                            </button>
                            <button
                                ref={notifBtnRef}
                                className="cd-notif-btn"
                                onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen) }}
                            >
                                <Bell />
                                {unreadCount > 0 && <span className="cd-notif-badge">{unreadCount}</span>}
                            </button>
                            <div className="cd-header-divider" />
                            <button className="cd-header-profile" onClick={() => setActiveNav('Profile')}>
                                {userPhoto ? (
                                    <img loading="lazy" src={userPhoto} alt="Coach" className="cd-header-avatar" />
                                ) : (
                                    <div className="cd-header-avatar cd-avatar-placeholder-xs" style={{width:32,height:32,fontSize:13,border:'none'}}>{(data?.userName || 'C')[0]}</div>
                                )}
                                <span className="cd-header-name">{(data?.userName || 'Coach').split(' ')[0]}</span>
                                <ChevronDown className="cd-header-chevron" />
                            </button>
                        </div>
                    </div>
                </header>

                <NotificationsDropdown
                    isOpen={notifOpen}
                    onClose={() => setNotifOpen(false)}
                    notifRef={notifRef}
                    notifBtnRef={notifBtnRef}
                />

                <div className="cd-content">
                    <div className="cd-space">
                        {/* ═══ WELCOME + KPIs ═══ */}
                        <section className="cd-welcome-wrap cd-fade">
                            <div className="cd-card cd-welcome-card">
                                <div>
                                    <p className="cd-welcome-label">Coach Control Panel</p>
                                    <h1 className="cd-welcome-title">{new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {(data?.userName || 'Coach').split(' ')[0]} 👋</h1>
                                    <p className="cd-welcome-desc">
                                        You have <span className="cd-highlight-yellow"><strong>{data?.kpis?.todaySessions || 0} sessions scheduled</strong></span> today.{' '}
                                        <span className="cd-highlight-white"><strong>{data?.kpis?.activeClients || 0} clients</strong></span> are actively following your programs.{' '}
                                        You're maintaining a <span className="cd-highlight-white"><strong>{data?.kpis?.completionRate || 0}% completion rate</strong></span>.
                                    </p>
                                </div>
                                <div className="cd-welcome-actions">
                                    <button className="cd-btn cd-btn-primary cd-btn-sm" onClick={() => setActiveNav('Workout Builder')}>
                                        <Plus /> Create Workout
                                    </button>
                                    <button className="cd-btn cd-btn-secondary cd-btn-sm" onClick={() => setActiveNav('My Schedule')}>
                                        <CalendarDays /> View Schedule
                                    </button>
                                </div>
                            </div>
                            <div className="cd-kpi-grid">
                                    <div className="cd-card cd-kpi-card">
                                        <div className="cd-kpi-icon-box cd-blue"><Users /></div>
                                        <div className="cd-kpi-value"><Counter target={data?.kpis?.activeClients || 0} visible={countersVisible} /></div>
                                        <div className="cd-kpi-label">Active Clients</div>
                                    </div>
                                    <div className="cd-card cd-kpi-card">
                                        <div className="cd-kpi-icon-box cd-green"><CalendarCheck /></div>
                                        <div className="cd-kpi-value">{data?.kpis?.todaySessions || 0}</div>
                                        <div className="cd-kpi-label">Today's Sessions</div>
                                    </div>
                                    <div className="cd-card cd-kpi-card">
                                        <div className="cd-kpi-icon-box cd-yellow"><TrendingUp /></div>
                                        <div className="cd-kpi-value">{data?.kpis?.completionRate || 0}<span className="cd-kpi-label" style={{ fontSize: '16px', display: 'inline', margin: 0 }}>%</span></div>
                                        <div className="cd-kpi-label">Completion Rate</div>
                                    </div>
                                    <div className="cd-card cd-kpi-card">
                                        <div className="cd-kpi-icon-box cd-orange"><Star /></div>
                                        <div className="cd-kpi-value">{data?.kpis?.avgRating || 0}</div>
                                        <div className="cd-kpi-label">Avg. Rating</div>
                                    </div>
                            </div>
                        </section>

                        {/* ═══ TODAY'S SCHEDULE + CLIENT PROGRESS ═══ */}
                        <section className="cd-grid-5 cd-fade-d1">
                            <div className="cd-card">
                                <div className="cd-section-hdr">
                                    <h3 className="cd-section-title">Today's Schedule</h3>
                                    <span className="cd-section-sub">{data?.weeklyVolume?.total || 0} sessions this week</span>
                                </div>
                                <div className="cd-session-list">
                                    {sessions.map((s, i) => {
                                        const colorMap = { green: 'rgba(34,197,94,.2)', blue: 'rgba(56,189,248,.2)', red: 'rgba(239,68,68,.2)', yellow: 'rgba(255,214,0,.3)' }
                                        const bgMap = { green: 'rgba(34,197,94,.03)', blue: 'rgba(56,189,248,.03)', red: 'rgba(239,68,68,.03)', yellow: 'rgba(255,214,0,.04)' }
                                        const divMap = { green: 'rgba(34,197,94,.3)', blue: 'rgba(56,189,248,.3)', red: 'rgba(239,68,68,.3)', yellow: 'rgba(255,214,0,.3)' }
                                        const c = s.border || 'green'
                                        return (
                                        <div
                                            key={i}
                                            className="cd-session-card"
                                            style={{ border: '1px solid ' + (colorMap[c] || colorMap.green), background: bgMap[c] || '', backgroundClip: 'padding-box' }}
                                            onClick={() => setActiveNav('My Schedule')}
                                        >
                                            <div className="cd-session-time">
                                                <div className={'cd-session-time-num' + (s.powerTime ? ' cd-power' : '')}>{s.time}</div>
                                                <div className={'cd-session-time-ampm' + (s.powerTime ? ' cd-power' : '')}>{s.ampm}</div>
                                            </div>
                                            <div className="cd-session-div" style={{ background: divMap[c] || divMap.green }} />
                                            <div className="cd-session-info">
                                                <div className="cd-session-name">
                                                    {s.name}
                                                    {s.badge?.type === 'completed' && (
                                                        <span className="cd-badge cd-badge-done">
                                                            {s.badge.text}
                                                        </span>
                                                    )}
                                                    {s.badge?.type === 'scheduled' && (
                                                        <span className="cd-badge cd-badge-pending">
                                                            {s.badge.dot && <span className="cd-badge-dot cd-yellow" />}{s.badge.text}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="cd-session-meta">
                                                    {s.detail && <span className="cd-session-sub">{s.detail}</span>}
                                                </div>
                                            </div>
                                            <ChevronRight className="cd-session-arrow" />
                                        </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="cd-card">
                                <div className="cd-section-hdr">
                                    <h3 className="cd-section-title">Client Progress</h3>
                                    <span className="cd-section-sub">This week</span>
                                </div>
                                <div className="cd-client-progress">
                                    {(data?.clientProgress || []).map((c, i) => (
                                        <div key={`${c.seed || i}-${c.name}`} className={'cd-client-row' + (c.flagged ? ' cd-flagged' : '')}>
                                            {c.photo ? <img loading="lazy" src={c.photo} alt="" className={'cd-client-avatar' + (c.dim ? ' cd-dim' : '')} /> : <div className={'cd-client-avatar cd-avatar-placeholder-sm' + (c.dim ? ' cd-dim' : '')}>{(c.name||'?')[0]}</div>}
                                            <div className="cd-client-body">
                                                <div className="cd-client-hdr">
                                                    <span className={'cd-client-name' + (c.dim ? ' cd-dim' : '')}>{c.name}</span>
                                                    <span className={'cd-client-count cd-' + c.countCls}>{c.count}</span>
                                                </div>
                                                <div className="cd-progress-bar">
                                                    <div className={'cd-progress-fill cd-' + c.barCls} style={{ width: barAnimated ? c.pct + '%' : '0%' }} />
                                                </div>
                                                <div className={'cd-client-foot' + (c.flagged ? ' cd-red' : '')}>{c.detail}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* ═══ WEEKLY VOLUME + MY PROGRAMS + EARNINGS ═══ */}
                        <section className="cd-grid-3 cd-fade-d2">
                            <div className="cd-card">
                                <div className="cd-section-hdr">
                                    <h3 className="cd-section-title-sm">Weekly Session Volume</h3>
                                    <span className="cd-section-sub">{data?.weeklyVolume?.total || 0} sessions total</span>
                                </div>
                                <div className="cd-weekly-bar-chart">
                                    {weekDays.map((d, i) => (
                                        <div key={d} className="cd-bar-col">
                                            <span className={'cd-day-label' + (i === 4 ? ' cd-highlight' : '')}>{d}</span>
                                            <div
                                                className={'cd-bar-fill' + (i < 5 ? ' cd-bar-yellow' : ' cd-bar-dim') + (i === 4 ? ' cd-bar-highlight' : '')}
                                                style={{ height: barAnimated ? weekData[i] + '%' : '0%' }}
                                            />
                                            <span className={i === 4 ? 'cd-bar-value-highlight' : i < 5 ? 'cd-bar-value' : 'cd-bar-value-dim'}>
                                                {weekValues[i]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="cd-card">
                                <div className="cd-section-hdr">
                                    <h3 className="cd-section-title-sm">My Programs</h3>
                                    <button className="cd-earn-link" onClick={() => setActiveNav('Programs')}>+ New</button>
                                </div>
                                <div className="cd-prog-list">
                                    {(data?.programs || []).map((p, i) => {
                                        const iconMap = { Flame, Dumbbell, Heart, Zap }
                                        const IconComp = iconMap[p.icon] || Flame
                                        return (
                                        <div key={p.name || i} className="cd-prog-item" onClick={() => setActiveNav('Programs')}>
                                            <div className={'cd-prog-icon cd-' + p.iconCls}><IconComp /></div>
                                            <div className="cd-prog-body">
                                                <div className="cd-prog-name">{p.name}</div>
                                                <div className="cd-prog-detail">{p.detail}</div>
                                            </div>
                                            <div className="cd-prog-right">
                                                <div className={'cd-prog-change cd-' + (p.cls || 'up')}>{p.change}</div>
                                                <div className="cd-prog-sub">{p.change} enrollment</div>
                                            </div>
                                        </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="cd-card">
                                <div className="cd-earnings-hdr">
                                    <h3 className="cd-section-title-sm">Earnings Overview</h3>
                                    <span className="cd-earnings-growth">{data?.earnings?.growth || ''}</span>
                                </div>
                                <div className="cd-earnings-total">
                                    <div className="cd-earnings-amount">{data?.earnings?.total || '$0'}</div>
                                    <div className="cd-earnings-target">This month · {data?.earnings?.sessionsDelivered || 0} sessions delivered</div>
                                </div>
                                <div className="cd-earnings-list">
                                    {(data?.earnings?.breakdown || []).map(e => (
                                        <div key={e.label} className="cd-earn-row">
                                            <div className="cd-earn-hdr">
                                                <span className="cd-earn-label">{e.label}</span>
                                                <span className="cd-earn-value">{e.value}</span>
                                            </div>
                                            <div className="cd-earn-bar">
                                                <div className={'cd-earn-fill cd-' + e.cls} style={{ width: barAnimated ? e.pct + '%' : '0%' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="cd-earnings-footer">
                                    <div>
                                        <div className="cd-pending-label">Pending Payout</div>
                                        <div className="cd-pending-value">{data?.earnings?.pendingPayout || '$0'}</div>
                                    </div>
                                    <button className="cd-earn-link" onClick={() => showToast('Earnings breakdown: $' + (data?.earnings?.total || '0') + ' total')}>View Breakdown →</button>
                                </div>
                            </div>
                        </section>

                        {/* ═══ CLIENT ROSTER + FEEDBACK ═══ */}
                        <section className="cd-grid-2 cd-fade-d3">
                            <div className="cd-card cd-roster">
                                <div className="cd-section-hdr">
                                    <h3 className="cd-section-title-sm">Client Roster</h3>
                                    <button className="cd-roster-link" onClick={() => setActiveNav('My Clients')}>View All {data?.kpis?.activeClients || 0} →</button>
                                </div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Client</th>
                                            <th>Program</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data?.clientRoster || []).slice(0, 4).map((c, i) => (
                                            <tr key={`${c.seed || i}-${c.name}`} className="cd-client-row" style={{ borderRadius: 0, padding: 0, margin: 0, border: 'none' }} onClick={() => { setSelectedClient(c); setClientModalOpen(true) }}>
                                                <td>
                                                    <div className="cd-client-cell">
                                                        {c.photo ? <img loading="lazy" src={c.photo} alt="" className={'cd-rost-avatar' + (c.dim ? ' cd-dim' : '')} /> : <div className={'cd-rost-avatar cd-avatar-placeholder-xs' + (c.dim ? ' cd-dim' : '')}>{(c.name||'?')[0]}</div>}
                                                        <div>
                                                            <div className={'cd-rost-name' + (c.dim ? ' cd-dim' : '')}>{c.name}</div>
                                                            <div className="cd-rost-tier">{c.tier}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span className={'cd-rost-prog cd-' + (c.progCls || 'orange') + (c.dim ? ' cd-dim' : '')}>{c.prog}</span></td>
                                                <td>
                                                    <span className={'cd-rost-status cd-' + (c.statusCls || 'on-track')}>
                                                        <span className={'cd-rost-dot cd-' + (c.dotCls || 'green')} />{c.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="cd-card">
                                <div className="cd-section-hdr">
                                    <h3 className="cd-section-title-sm">Client Feedback</h3>
                                    <span className="cd-section-sub">Last 7 days</span>
                                </div>
                                <div className="cd-feedback-list">
                                    {(data?.feedback || []).map((f, i) => (
                                        <div key={f.name || i} className="cd-fb-card">
                                            <div className="cd-fb-hdr">
                                                <div className="cd-fb-user">
                                                    {f.photo ? <img loading="lazy" src={f.photo} alt="" className="cd-fb-avatar" /> : <div className="cd-fb-avatar cd-avatar-placeholder-xs">{(f.name||'?')[0]}</div>}
                                                    <span className="cd-fb-name">{f.name}</span>
                                                </div>
                                                <StarRating filled={f.stars || 0} />
                                            </div>
                                            <p className="cd-fb-text">{f.text}</p>
                                            <div className="cd-fb-meta">{f.meta}</div>
                                        </div>
                                    ))}
                                    {(!data?.feedback?.length) && <p style={{ color: '#737373', textAlign: 'center', padding: '24px 0' }}>No feedback yet</p>}
                                </div>
                            </div>
                        </section>

                        {/* ═══ ATTENTION ═══ */}
                        <section className="cd-fade-d4">
                            <div className="cd-attn-hdr">
                                <h3 className="cd-section-title">Attention Required</h3>
                                <span className="cd-attn-hdr-sub"><span className="cd-attn-dot" /> {data?.attention?.length || 0} action item{(data?.attention?.length || 0) !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="cd-attention-list">
                                {(data?.attention || []).map((a, i) => (
                                    <div key={i} className={'cd-card cd-attention-item cd-' + (a.borderCls || 'red') + '-border'} onClick={() => setActiveNav('Messages')}>
                                        <div className={'cd-attn-icon cd-' + (a.iconCls || 'red')}><UserX /></div>
                                        <div className="cd-attn-body">
                                            <div className="cd-attn-line">
                                                <span className="cd-attn-text">{a.text}</span>
                                                <span className={'cd-badge cd-badge-' + (a.badgeCls || 'missed')}>{a.badge}</span>
                                            </div>
                                            <div className="cd-attn-sub">{a.sub}</div>
                                        </div>
                                        <button className={'cd-attn-btn cd-' + (a.btnCls || 'red') + '-btn'} onClick={(e) => { e.stopPropagation(); setActiveNav('Messages') }}>{a.btnText || 'Action'}</button>
                                    </div>
                                ))}
                                {(!data?.attention?.length) && <p style={{ color: '#737373', textAlign: 'center', padding: '24px 0' }}>All clear — no items requiring attention</p>}
                            </div>
                        </section>

                        <div className="cd-spacer" />
                    </div>
                </div>
                    </>
                )}
            </main>

            {/* ═══ CLIENT MODAL ═══ */}
            <div className={'cd-modal-overlay' + (clientModalOpen ? ' cd-modal-open' : '')} onClick={(e) => { if (e.target === e.currentTarget) { setClientModalOpen(false); setSelectedClient(null) } }}>
                <div className="cd-modal-content">
                    <div className="cd-modal-hdr">
                        <h3 className="cd-modal-title">Client Profile</h3>
                        <button className="cd-modal-close" onClick={() => { setClientModalOpen(false); setSelectedClient(null) }}><X /></button>
                    </div>
                    <div className="cd-modal-profile">
                        {selectedClient?.photo ? <img loading="lazy" src={selectedClient.photo} alt="" className="cd-modal-avatar" /> : <div className="cd-modal-avatar cd-avatar-placeholder-lg">{(selectedClient?.name||'?')[0]}</div>}
                        <div>
                            <div className="cd-modal-user-name">{selectedClient?.name || 'Client'}</div>
                            <div className="cd-modal-user-meta">{selectedClient?.tier || 'Active'}</div>
                            <div className="cd-modal-tags">
                                <span className="cd-badge cd-badge-active"><span className="cd-badge-dot cd-green" />{selectedClient?.status || 'On Track'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="cd-modal-info-grid">
                        {[
                            { label: 'Program', value: selectedClient?.prog || 'Active Program' },
                            { label: 'Status', value: selectedClient?.status || 'Active' },
                        ].map(info => (
                            <div key={info.label} className="cd-modal-info-item">
                                <div className="cd-modal-info-label">{info.label}</div>
                                <div className="cd-modal-info-value">{info.value}</div>
                            </div>
                        ))}
                    </div>
                    <div className="cd-modal-actions">
                        <button className="cd-btn cd-btn-primary" onClick={() => { setClientModalOpen(false); setSelectedClient(null); setActiveNav('Programs') }}>Adjust Program</button>
                        <button className="cd-btn cd-btn-secondary" onClick={() => { setClientModalOpen(false); setSelectedClient(null); setActiveNav('Messages') }}>Message</button>
                    </div>
                </div>
            </div>
            <DriverTour visible={activeNav === 'Dashboard'} />
        </div>
    )
}
