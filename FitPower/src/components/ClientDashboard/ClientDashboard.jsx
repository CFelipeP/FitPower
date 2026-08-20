import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import { exportProgressData } from '../../lib/export'
import { mediaUrl } from '../../lib/media'
import {
    Zap, X, LayoutDashboard, CalendarDays, Dumbbell, Utensils,
    BarChart3, Trophy, Users, MessageCircle, Target, Settings, Crown,
    Search, Bell, ChevronDown, Flame, Timer,
    Sunrise, Sun, Moon, Play,
    Heart, LogOut, User, Cookie, Camera, Video, Calculator, Snowflake
} from 'lucide-react'
import ProfileEditModal from '../ProfileModal/ProfileEditModal'
import NotificationsDropdown from '../NotificationsDropdown/NotificationsDropdown'
import ProgramsManager from '../ProgramsManager/ProgramsManager'
import WorkoutTracker from '../WorkoutTracker/WorkoutTracker'
import NutritionTracker from '../NutritionTracker/NutritionTracker'
import NutritionHistoryChart from '../NutritionHistoryChart/NutritionHistoryChart'
import ProgressCharts from '../ProgressCharts/ProgressCharts'
import ExerciseLibrary from '../ExerciseLibrary/ExerciseLibrary'
import DailyCheckin from '../DailyCheckin/DailyCheckin'
import MealPlanner from '../MealPlanner/MealPlanner'
import FeatureGate from '../FeatureGate'
import ProgressPhotos from '../ProgressPhotos/ProgressPhotos'
import SmartRoutine from '../SmartRoutine/SmartRoutine'
import Leaderboard from '../Leaderboard/Leaderboard'
import SettingsPanel from '../Settings/Settings'
import SocialFeed from '../SocialFeed/SocialFeed'
import ClientTrainingVideos from './ClientTrainingVideos'
import SubscriptionPlans from '../SubscriptionPlans/SubscriptionPlans'
import WorkoutHeatmap from '../WorkoutHeatmap/WorkoutHeatmap'
import TDEECalculator from '../TDEECalculator/TDEECalculator'
import ClientGoals from '../ClientGoals/ClientGoals'
import ProgressSlider from '../ProgressPhotos/ProgressSlider'
import Achievements from '../Achievements/Achievements'
import ClientTickets from '../ClientTickets/ClientTickets'

import Sidebar from '../Sidebar/Sidebar'
import { DashboardSkeleton } from '../LoadingSkeleton/LoadingSkeleton'
import '../DashboardShared.css'
import './ClientDashboard.css'
import { Counter } from '../Counter'

// Shared header for every client view (search, notifications, avatar).
// Kept in this file to avoid prop-drilling a new module; used 5x below.
function ClientHeader({ notifBtnRef, notifOpen, setNotifOpen, unreadCount, userPhoto, userName, onSelectExercise }) {
    const [search, setSearch] = useState('')
    const [results, setResults] = useState([])
    const [searchOpen, setSearchOpen] = useState(false)
    const debounceRef = useRef(null)

    const runSearch = useCallback((q) => {
        const term = q.trim()
        if (term.length < 2) {
            setResults([])
            return
        }
        apiFetch(`/exercises?search=${encodeURIComponent(term)}`)
            .then((d) => setResults(Array.isArray(d) ? d.slice(0, 8) : []))
            .catch(() => setResults([]))
    }, [])

    const handleChange = (value) => {
        setSearch(value)
        setSearchOpen(true)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => runSearch(value), 350)
    }

    return (
        <header className="cl-header">
            <div className="cl-header-inner">
                <div className="cl-header-left">
                    <div className="cl-search-wrap" style={{ position: 'relative' }}>
                        <Search className="cl-search-icon" />
                        <input
                            type="text"
                            placeholder="Search exercises..."
                            className="cl-search-input"
                            aria-label="Search exercises"
                            role="combobox"
                            aria-expanded={searchOpen && results.length > 0}
                            value={search}
                            onChange={e => handleChange(e.target.value)}
                            onFocus={() => setSearchOpen(true)}
                            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                        />
                        {searchOpen && results.length > 0 && (
                            <div className="cd-search-dropdown" role="listbox" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60 }}>
                                {results.map((r) => (
                                    <div
                                        key={r.id}
                                        role="option"
                                        aria-selected="false"
                                        tabIndex={0}
                                        className="cd-search-result"
                                        onClick={() => { setSearch(''); setSearchOpen(false); onSelectExercise?.(r) }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                setSearch(''); setSearchOpen(false); onSelectExercise?.(r)
                                            }
                                        }}
                                    >
                                        <span className="cd-search-type">{r.category || 'exercise'}</span>
                                        <div className="cd-search-result-info">
                                            <span className="cd-search-result-label">{r.name}</span>
                                            <span className="cd-search-result-sub">{r.muscleGroup || r.equipment || ''}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchOpen && search.trim().length >= 2 && results.length === 0 && (
                            <div className="cd-search-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60 }}>
                                <div className="cd-search-empty">No exercises found</div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="cl-header-right">
                    <div className="cl-notif-wrap" ref={notifBtnRef} onClick={() => setNotifOpen(!notifOpen)}>
                        <Bell className="cl-notif-bell" />
                        {unreadCount > 0 ? <span className="cl-notif-badge">{unreadCount}</span> : <div className="cl-notif-dot" />}
                    </div>
                    <div className="cl-avatar-wrap">
                        {userPhoto ? (
                            <img loading="lazy" src={userPhoto} alt="User avatar" className="cl-avatar" />
                        ) : (
                            <div className="cl-avatar cl-avatar-initials">{(userName || 'U').trim().charAt(0).toUpperCase()}</div>
                        )}
                        <ChevronDown className="cl-avatar-chevron" />
                    </div>
                </div>
            </div>
        </header>
    )
}

const navSections = [
    { type: 'heading', label: 'Main' },
    { type: 'item', label: 'Dashboard', icon: LayoutDashboard, active: true },
    { type: 'item', label: 'Programs', icon: CalendarDays },
    { type: 'item', label: 'Workouts', icon: Dumbbell },
    { type: 'item', label: 'Nutrition', icon: Utensils },
    { type: 'item', label: 'Progress', icon: BarChart3 },
    { type: 'heading', label: 'Health' },
    { type: 'item', label: 'Daily Check-in', icon: Heart },
    { type: 'item', label: 'Goals', icon: Target },
    { type: 'item', label: 'Macro Calculator', icon: Calculator },
    { type: 'item', label: 'Meal Planner', icon: Utensils },
    { type: 'item', label: 'Progress Photos', icon: Camera },
    { type: 'heading', label: 'Community' },
    { type: 'item', label: 'Training Videos', icon: Video },
    { type: 'item', label: 'Social Feed', icon: Users },
    { type: 'item', label: 'My Exercises', icon: Dumbbell },
    { type: 'item', label: 'Leaderboard', icon: Users },
    { type: 'heading', label: 'Account' },
    { type: 'item', label: 'Profile', icon: User },
    { type: 'item', label: 'Settings', icon: Settings },
    { type: 'item', label: 'Support', icon: MessageCircle },
    { type: 'item', label: 'Upgrade Plan', icon: Crown },
    { type: 'item', label: 'Log Out', icon: LogOut },
]

const mealIcons = [Sunrise, Sun, Moon, Cookie]
const PROGRESS_RING_RADIUS = 42
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS

function IconComp({ icon, fallback }) {
    const Icon = icon || fallback
    if (!Icon) return null
    return <Icon />
}

export default function ClientDashboard() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const { logout: authLogout } = useAuth()
    const [notifOpen, setNotifOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [profileModalOpen, setProfileModalOpen] = useState(false)
    const [profileForm, setProfileForm] = useState({
        firstName: '', lastName: '', email: '', photo: '',
        fitnessLevel: '', primaryGoal: '', trainingDays: ''
    })
    const [profileFormLoading, setProfileFormLoading] = useState(false)
    const [profileFormSaving, setProfileFormSaving] = useState(false)
    const [userPhoto, setUserPhoto] = useState('')
    const [activeNav, setActiveNav] = useState('Dashboard')
    const [waterCount, setWaterCount] = useState(0)
    const [mealChecked, setMealChecked] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [countersVisible, setCountersVisible] = useState(false)
    const [barAnimated, setBarAnimated] = useState(false)
    const [data, setData] = useState(null)
    const [planSubtitle, setPlanSubtitle] = useState('FITPOWER MEMBER')
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [profileData, setProfileData] = useState(null)
    const [profileLoading, setProfileLoading] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)

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
    const meals = data?.meals?.length ? data.meals : []
    const activities = data?.recentActivity?.length ? data.recentActivity : []
    const actIconMap = { Activity: BarChart3, Flame, Dumbbell, Heart, Zap, MessageCircle, Trophy, Target, Crown, Users }
    const notifRef = useRef(null)
    const notifBtnRef = useRef(null)
    const cursorDotRef = useRef(null)
    const cursorRingRef = useRef(null)
    const cursorPos = useRef({ x: 0, y: 0 })
    const ringPos = useRef({ x: 0, y: 0 })
    const rafRef = useRef(null)

    const loadDashboard = useCallback(() => {
        apiFetch('/dashboard/client')
            .then(d => {
                setData(d)
                setLoadError(null)
                if (d.waterCount !== undefined) setWaterCount(d.waterCount)
                if (d.mealChecked) setMealChecked(d.mealChecked)
                if (d.notifications) setUnreadCount(d.notifications.filter(n => !n.read).length)
            })
            .catch((e) => setLoadError(e.message || 'Check your connection and try again.'))
            .finally(() => setLoading(false))
        apiFetch('/auth/me')
            .then(u => setUserPhoto(mediaUrl(u.photo)))
            .catch(() => {})
        // Show the real plan name instead of a hardcoded label.
        apiFetch('/entitlements')
            .then(e => setPlanSubtitle(e?.planName ? e.planName.toUpperCase() + ' MEMBER' : 'FREE MEMBER'))
            .catch(() => {})
    }, [])

    useEffect(() => { loadDashboard() }, [loadDashboard])

    // Refresh dashboard data whenever the user returns to this tab so new
    // workouts, coach assignments and messages appear without manual reload.
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') loadDashboard()
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
    }, [loadDashboard])

    // Poll unread notifications so new coach assignments/messages appear in
    // near real time without a manual refresh.
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

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await apiFetch('/achievements/check', { method: 'POST' })
                if (res?.new_achievements?.length) {
                    res.new_achievements.forEach(a => {
                        showToast(`🏆 Achievement Unlocked: ${a.name}!`)
                    })
                }
            } catch { /* ignore polling errors */ }
        }, 300000)
        return () => clearInterval(interval)
    }, [showToast])

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

        const hoverTargets = document.querySelectorAll('.client-dashboard a, .client-dashboard button, .client-dashboard input, .cl-nav-item, .cl-water-glass, .cl-meal-card, .cl-notif-item, .cl-modal-overlay, .cl-next-card')
        const addHover = () => {
            if (cursorDotRef.current) cursorDotRef.current.classList.add('cl-hover')
            if (cursorRingRef.current) cursorRingRef.current.classList.add('cl-hover')
        }
        const removeHover = () => {
            if (cursorDotRef.current) cursorDotRef.current.classList.remove('cl-hover')
            if (cursorRingRef.current) cursorRingRef.current.classList.remove('cl-hover')
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

    const handleNavClick = useCallback((label) => {
        if (label === 'Log Out') {
            authLogout()
            navigate('/login')
            return
        }
        if (label === 'Profile') {
            setActiveNav(label)
            return
        }
        setActiveNav(label)
    }, [authLogout, navigate])

    const handleWaterClick = (idx) => {
        const newCount = (() => {
            if (idx < waterCount) return idx
            const next = idx + 1
            return next > 8 ? 8 : next
        })()
        setWaterCount(newCount)
        apiFetch('/water', { method: 'POST', body: JSON.stringify({ glasses: newCount }) }).catch(() => {})
        showToast(newCount >= 8 ? 'Daily goal reached! 🎉' : 'Water logged ✓')
    }

    const handleMealClick = (idx) => {
        setMealChecked(prev => {
            const next = [...prev]
            next[idx] = !next[idx]
            apiFetch('/nutrition', {
                method: 'POST',
                body: JSON.stringify({
                    date: 'today',
                    breakfastChecked: next[0],
                    lunchChecked: next[1],
                    dinnerChecked: next[2],
                    snackChecked: next[3],
                }),
            }).catch(() => {})
            return next
        })
    }

    const handleFreezeStreak = async () => {
        try {
            await apiFetch('/streak/freeze', { method: 'POST', body: JSON.stringify({}) })
            showToast('Streak protected for today — rest easy.')
            apiFetch('/dashboard/client').then(setData).catch(() => {})
        } catch (e) {
            showToast(e.message || 'Could not freeze your streak')
        }
    }

    return (
        <div className="client-dashboard cl-grid-bg cl-noise">
            <div className="cl-cursor-dot" ref={cursorDotRef} />
            <div className="cl-cursor-ring" ref={cursorRingRef} />

            <Sidebar
                items={navSections}
                activeNav={activeNav}
                onNavClick={handleNavClick}
                userName={data?.userName || 'Athlete'}
                userSubtitle={planSubtitle}
                avatarUrl={userPhoto || ''}
                role="client"
                mobileRight={(
                    <div className="cl-mobile-right">
                        <button className="cl-mobile-icon-btn" ref={notifBtnRef} onClick={() => setNotifOpen(!notifOpen)} aria-label="Notifications">
                            <Bell size={18} />
                            <span className="cl-mobile-notif-dot" />
                        </button>
                        {userPhoto ? (
                            <img loading="lazy" src={userPhoto} alt="User avatar" className="cl-avatar cl-mobile-avatar" />
                        ) : (
                            <div className="cl-avatar cl-avatar-initials cl-mobile-avatar">{(profileData?.firstName || data?.userName || 'U').trim().charAt(0).toUpperCase()}</div>
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
                        <button className="cl-btn cl-btn-primary" onClick={() => { setLoadError(null); setLoading(true); loadDashboard() }}>
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ NOTIFICATIONS ═══ */}
            <NotificationsDropdown
                isOpen={notifOpen}
                onClose={() => setNotifOpen(false)}
                notifRef={notifRef}
                notifBtnRef={notifBtnRef}
            />

            {/* ═══ MAIN ═══ */}
            <main className="cl-main" style={{ marginLeft: sidebarCollapsed ? 64 : 260 }}>
                {activeNav === 'Dashboard' ? (
                    <>
                        <ClientHeader
                            notifBtnRef={notifBtnRef}
                            notifOpen={notifOpen}
                            setNotifOpen={setNotifOpen}
                            unreadCount={unreadCount}
                            userPhoto={userPhoto}
                            userName={profileData?.firstName || data?.userName || 'U'}
                            onSelectExercise={() => setActiveNav('Exercises')}
                        />
                        <div className="cl-content">
                    <div className="cl-space">
                        {/* ═══ COACH APPLICATION STATUS ═══ */}
                        {data?.coachApplication && (
                            <div className={'cl-app-banner cl-app-' + data.coachApplication.status}>
                                {data.coachApplication.status === 'pending' && (
                                    <>Your coach application is under review. We'll notify you when an administrator processes it.</>
                                )}
                                {data.coachApplication.status === 'approved' && (
                                    <>Your coach application was approved! Log out and log back in as a coach.</>
                                )}
                                {data.coachApplication.status === 'rejected' && (
                                    <>Your coach application was rejected. Contact support if you have questions.</>
                                )}
                            </div>
                        )}

                        {/* ═══ WELCOME + QUICK STATS ═══ */}
                        <section className="cl-fade">
                            <div className="cl-welcome-wrap">
                                <div className="cl-card cl-welcome-card">
                                    <div>
                                        <p className="cl-welcome-label">Good morning,</p>
                                        <h1 className="cl-welcome-title">
                                            {data?.userName || 'Athlete'} 👋
                                        </h1>
                                        <p className="cl-welcome-desc">
                                            You're on a <span className="cl-highlight-yellow"><strong>{data?.kpis?.streak || 0}-day streak</strong></span>.
                                            {data?.kpis?.bestStreak > 0 && ` Best: ${data.kpis.bestStreak} days.`}
                                            {data?.streak?.atRisk
                                                ? ' Complete a workout today to keep it.'
                                                : ' Keep pushing.'}
                                        </p>
                                        {data?.streak?.atRisk && (
                                            <button
                                                className="cl-streak-freeze-btn"
                                                disabled={!data?.streak?.freezeAvailable}
                                                onClick={handleFreezeStreak}
                                            >
                                                <Snowflake size={14} />
                                                {data?.streak?.freezeAvailable
                                                    ? 'Freeze streak for today (1/month)'
                                                    : 'Freeze used this month'}
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        className="cl-btn cl-btn-primary"
                                        style={{ marginTop: '24px' }}
                                        onClick={() => {
                                            if (data?.nextWorkout) setModalOpen(true)
                                            else if (data?.activeProgram) setActiveNav('Workouts')
                                            else setActiveNav('Programs')
                                        }}
                                    >
                                        <Play className="" style={{ width: 16, height: 16 }} />
                                        {data?.nextWorkout ? "Start Today's Workout" : data?.activeProgram ? 'View My Workouts' : 'Find a Program'}
                                    </button>
                                </div>
                                <div className="cl-kpi-grid">
                                    <div className="cl-card cl-kpi-card">
                                        <div className="cl-kpi-icon-box cl-orange"><Flame /></div>
                                        <div className="cl-kpi-value"><Counter target={data?.kpis?.calories || 0} visible={countersVisible} /></div>
                                        <div className="cl-kpi-label">Calories Today</div>
                                    </div>
                                    <div className="cl-card cl-kpi-card">
                                        <div className="cl-kpi-icon-box cl-yellow"><Dumbbell /></div>
                                        <div className="cl-kpi-value">
                                            {data?.kpis?.workouts?.split('/')[0] || '—'}<span className="cl-kpi-value-sub">/{data?.kpis?.workouts?.split('/')[1] || '—'}</span>
                                        </div>
                                        <div className="cl-kpi-label">Workouts this month</div>
                                    </div>
                                    <div className="cl-card cl-kpi-card">
                                        <div className="cl-kpi-icon-box cl-green"><Timer /></div>
                                        <div className="cl-kpi-value">{data?.kpis?.totalHours || 0}<span className="cl-kpi-value-sub">h</span></div>
                                        <div className="cl-kpi-label">Total time this week</div>
                                    </div>
                                    <div className="cl-card cl-kpi-card">
                                        <div className="cl-kpi-icon-box cl-blue"><Target /></div>
                                        <div className="cl-kpi-value" style={{ color: 'var(--power-500)' }}>{data?.kpis?.streak || 0}</div>
                                        <div className="cl-kpi-label">Day streak</div>
                                        <div className="cl-kpi-label" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            Best: {data?.kpis?.bestStreak || 0} days
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ═══ PROGRAM PROGRESS + WEEKLY ACTIVITY ═══ */}
                        <section className="cl-grid-5 cl-fade-d1">
                            <div className="cl-card">
                                <div className="cl-section-hdr">
                                    <h3 className="cl-section-title">Active Program</h3>
                                    <span className="cl-section-sub" style={{ color: 'var(--power-500)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{data?.activeProgram?.week || ''}</span>
                                </div>
                                <div style={{ marginBottom: 8 }}>
                                    <h4 style={{ fontWeight: 600, color: '#fff', fontSize: 16, marginBottom: 4 }}>{data?.activeProgram?.name || 'No active program'}</h4>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>Coach: {data?.activeProgram?.coach || '—'} · {data?.activeProgram?.duration || ''}</p>
                                </div>
                                <div className="cl-prog-ring-wrap">
                                    <div className="cl-prog-ring">
                                        <svg className="cl-prog-ring-svg" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="42" className="cl-prog-ring-bg" />
                                            <circle
                                                cx="50" cy="50" r="42"
                                                className="cl-prog-ring-fill"
                                                strokeDasharray={PROGRESS_RING_CIRCUMFERENCE}
                                                strokeDashoffset={barAnimated ? PROGRESS_RING_CIRCUMFERENCE * (1 - (data?.activeProgram?.progress || 0) / 100) : PROGRESS_RING_CIRCUMFERENCE}
                                            />
                                        </svg>
                                        <div className="cl-prog-ring-label">{data?.activeProgram?.progress || 0}%</div>
                                    </div>
                                    <div className="cl-prog-bars">
                                        <div>
                                            <div className="cl-prog-bar-hdr">
                                                <span className="cl-prog-bar-label">Workouts done</span>
                                                <span className="cl-prog-bar-value">{data?.activeProgram?.workoutsDone || '0/0'}</span>
                                            </div>
                                            <div className="cl-prog-bar-track">
                                                <div className="cl-prog-bar-fill cl-yellow" style={{ width: barAnimated ? (data?.activeProgram?.progress || 0) + '%' : '0%' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="cl-prog-bar-hdr">
                                                <span className="cl-prog-bar-label">Avg. RPE</span>
                                                <span className="cl-prog-bar-value">{data?.activeProgram?.avgRPE || '—'}</span>
                                            </div>
                                            <div className="cl-prog-bar-track">
                                                <div className="cl-prog-bar-fill cl-green" style={{ width: barAnimated ? (parseFloat(data?.activeProgram?.avgRPE || '0') * 10) + '%' : '0%' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button className="cl-prog-link" onClick={() => setActiveNav('Programs')}>View Full Program →</button>
                            </div>

                                    <div className="cl-card">
                                <div className="cl-section-hdr">
                                    <h3 className="cl-section-title">This Month</h3>
                                </div>
                                <div className="cl-month-summary">
                                    <div className="cl-month-row">
                                        <span className="cl-month-label">Workouts completed</span>
                                        <span className="cl-month-value">{data?.kpis?.workouts || '—'}</span>
                                    </div>
                                    <div className="cl-month-row">
                                        <span className="cl-month-label">Total time</span>
                                        <span className="cl-month-value">{data?.kpis?.totalHours || 0}h</span>
                                    </div>
                                    <div className="cl-month-row">
                                        <span className="cl-month-label">Avg. RPE</span>
                                        <span className="cl-month-value">{data?.activeProgram?.avgRPE || '—'}</span>
                                    </div>
                                </div>
                                {(data?.kpis?.workouts?.split('/')[0] === '0' || !data?.kpis?.workouts) && (
                                    <p className="cl-month-hint">Complete a workout session to start building your month.</p>
                                )}
                            </div>
                        </section>

                        {/* ═══ WORKOUT HEATMAP ═══ */}
                        <section className="cl-fade-d2">
                            <WorkoutHeatmap />
                        </section>

                        {/* ═══ PROGRESS PHOTOS ═══ */}
                        <section className="cl-fade-d2">
                            <h3 style={{fontSize:18,fontWeight:700,marginBottom:16,display:'flex',alignItems:'center',gap:8}}><Camera size={20} style={{color:'var(--power-500)'}} /> Progress Photos</h3>
                            <ProgressSlider />
                        </section>

                        {/* ═══ NUTRITION + WATER + NEXT WORKOUT ═══ */}
                        <section className="cl-grid-3 cl-fade-d2">
                            <div className="cl-card">
                                <div className="cl-section-hdr" style={{ marginBottom: 20 }}>
                                    <h3 className="cl-section-title-sm">Today's Macros</h3>
                                    <span className="cl-section-sub" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Target: {data?.macros?.target || ''}</span>
                                </div>
                                <div className="cl-macro-item">
                                    <div className="cl-macro-hdr">
                                        <span className="cl-macro-label">Protein</span>
                                        <span className="cl-macro-value">{data?.macros?.protein?.current || 0}g / {data?.macros?.protein?.target || 150}g</span>
                                    </div>
                                    <div className="cl-macro-track">
                                        <div className="cl-macro-fill cl-protein" style={{ width: data?.macros?.protein?.pct || '0%' }} />
                                    </div>
                                </div>
                                <div className="cl-macro-item">
                                    <div className="cl-macro-hdr">
                                        <span className="cl-macro-label">Carbs</span>
                                        <span className="cl-macro-value">{data?.macros?.carbs?.current || 0}g / {data?.macros?.carbs?.target || 220}g</span>
                                    </div>
                                    <div className="cl-macro-track">
                                        <div className="cl-macro-fill cl-carbs" style={{ width: data?.macros?.carbs?.pct || '0%' }} />
                                    </div>
                                </div>
                                <div className="cl-macro-item" style={{ marginBottom: 0 }}>
                                    <div className="cl-macro-hdr">
                                        <span className="cl-macro-label">Fat</span>
                                        <span className="cl-macro-value">{data?.macros?.fat?.current || 0}g / {data?.macros?.fat?.target || 65}g</span>
                                    </div>
                                    <div className="cl-macro-track">
                                        <div className="cl-macro-fill cl-fat" style={{ width: data?.macros?.fat?.pct || '0%' }} />
                                    </div>
                                </div>
                                <div className="cl-macro-footer">
                                    <span className="cl-macro-total-label">Total consumed</span>
                                    <span className="cl-macro-total-value">{data?.macros?.totalConsumed || '0 kcal'}</span>
                                </div>
                            </div>

                            <div className="cl-card">
                                <div className="cl-water-hdr">
                                    <h3 className="cl-section-title-sm">Water Intake</h3>
                                    <span className="cl-water-count">{data?.waterCount ?? waterCount}/8 glasses</span>
                                </div>
                                <div className="cl-water-grid">
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                                        <div
                                            key={i}
                                            className="cl-water-glass"
                                            onClick={() => handleWaterClick(i)}
                                        >
                                            <div
                                                className="cl-water-fill"
                                                style={{ height: i < waterCount ? '100%' : '0%', background: i < waterCount ? 'rgba(56,189,248,.25)' : 'rgba(56,189,248,.05)' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="cl-water-footer">
                                    <span className="cl-water-goal">Goal: 2L (8 glasses)</span>
                                    <span className="cl-water-remaining">
                                        {waterCount >= 8 ? 'Goal reached! 🎉' : (2000 - waterCount * 250) + 'ml left'}
                                    </span>
                                </div>
                            </div>

                            <div
                                className="cl-card cl-next-card"
                                onClick={() => { if (data?.nextWorkout) setModalOpen(true) }}
                            >
                                <div className="cl-next-bg cl-next-bg-plain">
                                    <Dumbbell size={48} style={{ color: 'rgba(255, 214, 0, 0.25)' }} />
                                </div>
                                <div className="cl-next-overlay" />
                                <div className="cl-next-content">
                                    <span className="cl-next-badge">Next up</span>
                                    <h4 className="cl-next-title">{data?.nextWorkout?.title || 'No upcoming workout'}</h4>
                                    <p className="cl-next-desc">{data?.nextWorkout?.date ? data.nextWorkout.date + (data.nextWorkout.time ? ' · ' + data.nextWorkout.time : '') : 'Rest and recover'}</p>
                                    {data?.nextWorkout?.trainer && (
                                        <div className="cl-next-coach">
                                            <div>
                                                <div className="cl-next-coach-name">{data.nextWorkout.trainer}</div>
                                                <div className="cl-next-coach-time">Coach</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* ═══ SMART ROUTINE (AI-powered programming — Pro+) ═══ */}
                        <section className="cl-fade-d3">
                            <FeatureGate
                                feature="ai_programming"
                                mode="locked"
                                fallbackTitle="AI-powered programming"
                                fallbackDesc="Generates your daily smart routine with the Pro plan. This feature requires the Pro plan."
                            >
                                <SmartRoutine />
                            </FeatureGate>
                        </section>

                        {/* ═══ BODY METRICS + MEAL PLAN ═══ */}
                        <section className="cl-grid-4 cl-fade-d3">
                            <div className="cl-card-static">
                                <div className="cl-section-hdr">
                                    <h3 className="cl-section-title-sm">Body Metrics</h3>
                                    <span className="cl-section-sub">{data?.bodyMetrics?.updated ? 'Updated ' + data.bodyMetrics.updated : ''}</span>
                                </div>
                                <div className="cl-metrics-grid">
                                    <div className="cl-metric-item">
                                        <div className="cl-metric-label">Weight</div>
                                        <div className="cl-metric-value">{data?.bodyMetrics?.weight?.value || '—'}<span className="cl-metric-unit">{data?.bodyMetrics?.weight?.unit || ''}</span></div>
                                        <div className={'cl-metric-change cl-' + (data?.bodyMetrics?.weight?.direction || 'down')}>{data?.bodyMetrics?.weight?.change || ''}</div>
                                    </div>
                                    <div className="cl-metric-item">
                                        <div className="cl-metric-label">Body Fat</div>
                                        <div className="cl-metric-value">{data?.bodyMetrics?.bodyFat?.value || '—'}<span className="cl-metric-unit">{data?.bodyMetrics?.bodyFat?.unit || ''}</span></div>
                                        <div className={'cl-metric-change cl-' + (data?.bodyMetrics?.bodyFat?.direction || 'down')}>{data?.bodyMetrics?.bodyFat?.change || ''}</div>
                                    </div>
                                    <div className="cl-metric-item">
                                        <div className="cl-metric-label">Muscle</div>
                                        <div className="cl-metric-value">{data?.bodyMetrics?.muscle?.value || '—'}<span className="cl-metric-unit">{data?.bodyMetrics?.muscle?.unit || ''}</span></div>
                                        <div className={'cl-metric-change cl-' + (data?.bodyMetrics?.muscle?.direction || 'up')}>{data?.bodyMetrics?.muscle?.change || ''}</div>
                                    </div>
                                    <div className="cl-metric-item">
                                        <div className="cl-metric-label">BMI</div>
                                        <div className="cl-metric-value">{data?.bodyMetrics?.bmi?.value || '—'}</div>
                                        <div className={'cl-metric-change cl-' + (data?.bodyMetrics?.bmi?.direction || 'up')}>{data?.bodyMetrics?.bmi?.change || ''}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="cl-card-static">
                                <div className="cl-section-hdr" style={{ marginBottom: 20 }}>
                                    <h3 className="cl-section-title-sm">Today's Meals</h3>
                                    <span className="cl-section-sub">{data?.macros?.totalConsumed || '0'} / {data?.macros?.target || ''}</span>
                                </div>
                                <div className="cl-meal-list">
                                    {meals.map((m, i) => (
                                        <div
                                            key={i}
                                            className={'cl-meal-card' + (mealChecked[i] ? '' : i === 3 ? ' cl-lighter' : ' cl-dim')}
                                            onClick={() => handleMealClick(i)}
                                        >
                                            <div className={'cl-meal-icon cl-' + m.color}><IconComp icon={mealIcons[i]} fallback={Sunrise} /></div>
                                            <div className="cl-meal-body">
                                                <div className="cl-meal-name">{m.name}</div>
                                                <div className="cl-meal-detail">{m.detail}</div>
                                            </div>
                                            <span className={'cl-meal-check' + (mealChecked[i] ? ' cl-done' : ' cl-pending')}>
                                                {mealChecked[i] ? '✓' : '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* ═══ RECENT ACTIVITY ═══ */}
                        <section className="cl-fade-d4">
                            <div className="cl-section-hdr">
                                <h3 className="cl-section-title">Recent Activity</h3>
                            </div>
                            <div className="cl-activity">
                                {activities.map((a, i) => (
                                    <div key={i} className="cl-card cl-activity-item" style={{ cursor: 'pointer' }} onClick={() => showToast(a.name || 'Activity details')}>
                                        <div className={'cl-activity-icon cl-' + a.color}><IconComp icon={actIconMap[a.icon]} fallback={actIconMap.Activity} /></div>
                                        <div className="cl-activity-body">
                                            <div className="cl-activity-line">
                                                <span className="cl-activity-name">{a.name}</span>
                                                {a.badge && (
                                                    <span className={'cl-activity-badge cl-' + a.badge.cls}>{a.badge.text}</span>
                                                )}
                                            </div>
                                            <div className="cl-activity-detail">{a.detail}</div>
                                        </div>
                                        <span className="cl-activity-time">{a.time}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ═══ ACHIEVEMENTS ═══ */}
                        <section className="cl-fade-d5">
                            <Achievements compact={true} onShare={true} />
                        </section>

                    <div className="cl-spacer" />
                </div>
            </div>
        </>
    ) : activeNav === 'Programs' ? (
        <ProgramsManager role="client" />
    ) : activeNav === 'Workouts' ? (
        <WorkoutTracker />
    ) : activeNav === 'Nutrition' ? (
        <>
            <NutritionTracker />
            <div style={{ marginTop: 24 }}>
                <NutritionHistoryChart />
            </div>
        </>
    ) : activeNav === 'Progress' ? (
        <div className="dashboard-section">
            <div className="dashboard-section-header">
                <h2 className="dashboard-section-title">Progress</h2>
                <button className="dashboard-export-btn" onClick={() => exportProgressData(data?.metrics || [])}>
                    Export PDF
                </button>
            </div>
            {data?.metrics && <ProgressCharts data={data.metrics} />}
        </div>
    ) : activeNav === 'Training Videos' ? (
        <ClientTrainingVideos />
    ) : activeNav === 'My Exercises' ? (
        <ExerciseLibrary />
    ) : activeNav === 'Daily Check-in' ? (
        <DailyCheckin />
    ) : activeNav === 'Meal Planner' ? (
        <FeatureGate
            feature="custom_nutrition"
            mode="locked"
            fallbackTitle="Custom nutrition plans"
            fallbackDesc="Plan your meals with personalized meal plans. This feature requires the Pro plan."
        >
            <MealPlanner />
        </FeatureGate>
    ) : activeNav === 'Progress Photos' ? (
        <ProgressPhotos />
    ) : activeNav === 'Settings' ? (
        <SettingsPanel />
    ) : activeNav === 'Macro Calculator' ? (
        <TDEECalculator />
    ) : activeNav === 'Goals' ? (
        <ClientGoals />
    ) : activeNav === 'Support' ? (
        <ClientTickets />
    ) : activeNav === 'Leaderboard' ? (
        <Leaderboard />
    ) : activeNav === 'Social Feed' ? (
        <div className="cl-social-feed-view">
            <ClientHeader
                notifBtnRef={notifBtnRef}
                notifOpen={notifOpen}
                setNotifOpen={setNotifOpen}
                unreadCount={unreadCount}
                userPhoto={userPhoto}
                userName={profileData?.firstName || data?.userName || 'U'}
                onSelectExercise={() => setActiveNav('Exercises')}
            />
            <div className="cl-content">
                <div className="cl-space">
                    <SocialFeed />
                    <div className="cl-spacer" />
                </div>
            </div>
        </div>
    ) : activeNav === 'Profile' ? (
        <div className="cl-profile-view">
            <ClientHeader
                notifBtnRef={notifBtnRef}
                notifOpen={notifOpen}
                setNotifOpen={setNotifOpen}
                unreadCount={unreadCount}
                userPhoto={userPhoto}
                userName={profileData?.firstName || data?.userName || 'U'}
                onSelectExercise={() => setActiveNav('Exercises')}
            />
            <div className="cl-content">
                <div className="cl-space">
                    {profileLoading ? (
                        <div className="cl-spinner" style={{ margin: '80px auto' }} />
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
                                    <button className="cl-btn cl-btn-primary" onClick={() => setProfileModalOpen(true)}>
                                        Edit Profile
                                    </button>
                                </div>
                                <div className="cl-profile-details-grid">
                                    <div className="cl-card">
                                        <div className="cl-profile-detail-label">Fitness Level</div>
                                        <div className="cl-profile-detail-value">{profileData.fitnessLevel ? profileData.fitnessLevel.charAt(0).toUpperCase() + profileData.fitnessLevel.slice(1) : 'Not set'}</div>
                                    </div>
                                    <div className="cl-card">
                                        <div className="cl-profile-detail-label">Primary Goal</div>
                                        <div className="cl-profile-detail-value">{profileData.primaryGoal ? profileData.primaryGoal.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Not set'}</div>
                                    </div>
                                    <div className="cl-card">
                                        <div className="cl-profile-detail-label">Training Days / Week</div>
                                        <div className="cl-profile-detail-value">{profileData.trainingDays || 'Not set'}</div>
                                    </div>
                                    <div className="cl-card">
                                        <div className="cl-profile-detail-label">Member Since</div>
                                        <div className="cl-profile-detail-value">{profileData.memberSince ? new Date(profileData.memberSince).toLocaleDateString() : '—'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="cl-spacer" />
                    )}
                    <div className="cl-spacer" />
                </div>
            </div>
        </div>
    ) : activeNav === 'Upgrade Plan' ? (
        <div className="cl-upgrade-view">
            <ClientHeader
                notifBtnRef={notifBtnRef}
                notifOpen={notifOpen}
                setNotifOpen={setNotifOpen}
                unreadCount={unreadCount}
                userPhoto={userPhoto}
                userName={profileData?.firstName || data?.userName || 'U'}
                onSelectExercise={() => setActiveNav('Exercises')}
            />
            <div className="cl-content">
                <div className="cl-space">
                    <SubscriptionPlans />
                    <div className="cl-spacer" />
                </div>
            </div>
        </div>
    ) : (
        <>
            <ClientHeader
                notifBtnRef={notifBtnRef}
                notifOpen={notifOpen}
                setNotifOpen={setNotifOpen}
                unreadCount={unreadCount}
                userPhoto={userPhoto}
                userName={profileData?.firstName || data?.userName || 'U'}
                onSelectExercise={() => setActiveNav('Exercises')}
            />
            <div className="cl-content">
                <div className="cl-space">
                    <div className="cl-spacer" />
                </div>
            </div>
        </>
    )}
</main>

            {/* ═══ WORKOUT MODAL ═══ */}
            <div className={'cl-modal-overlay' + (modalOpen ? ' cl-modal-open' : '')} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}>
                <div className="cl-modal-box">
                    <div className="cl-modal-img-wrap">
                        <div className="cl-modal-img cl-modal-img-plain">
                            <Dumbbell size={64} style={{ color: 'rgba(255, 214, 0, 0.25)' }} />
                        </div>
                        <div className="cl-modal-img-overlay" />
                        <button className="cl-modal-close-btn" onClick={() => setModalOpen(false)}><X /></button>
                        <div className="cl-modal-img-content">
                            <span className="cl-modal-tag">Scheduled session</span>
                            <h3 className="cl-modal-img-title">{data?.nextWorkout?.title || 'Workout'}</h3>
                            <p className="cl-modal-img-sub">{data?.nextWorkout?.trainer || '—'}{data?.nextWorkout?.date ? ' · ' + data.nextWorkout.date + (data.nextWorkout.time ? ' ' + data.nextWorkout.time : '') : ''}</p>
                        </div>
                    </div>
                    <div className="cl-modal-body">
                        <p className="cl-modal-note">
                            This session is scheduled in your calendar. You can see its exercises and complete it from the Workouts section.
                        </p>
                        <button
                            className="cl-modal-start"
                            onClick={() => { setModalOpen(false); setActiveNav('Workouts') }}
                        >
                            Go to My Workouts
                        </button>
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
                    apiFetch('/dashboard/client').then(d => {
                        setData(d)
                        if (d.waterCount !== undefined) setWaterCount(d.waterCount)
                        if (d.mealChecked) setMealChecked(d.mealChecked)
                    }).catch(() => {})
                    apiFetch('/auth/me').then(setProfileData).catch(() => {})
                }}
            />}
        </div>
    )
}
