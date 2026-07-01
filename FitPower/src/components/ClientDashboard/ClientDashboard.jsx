import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import { exportProgressData } from '../../lib/export'
import {
    Zap, X, LayoutDashboard, CalendarDays, Dumbbell, Utensils,
    BarChart3, Trophy, Users, MessageCircle, Target, Settings, Crown,
    Search, Bell, ChevronDown, Flame, Timer,
    Sunrise, Sun, Moon, Play, ArrowRight,
    Award, Heart, LogOut, User, Cookie, Camera, Video, Calculator
} from 'lucide-react'
import ProfileModal from '../ProfileModal/ProfileModal'
import NotificationsDropdown from '../NotificationsDropdown/NotificationsDropdown'
import ProgramsManager from '../ProgramsManager/ProgramsManager'
import WorkoutTracker from '../WorkoutTracker/WorkoutTracker'
import NutritionTracker from '../NutritionTracker/NutritionTracker'
import NutritionHistoryChart from '../NutritionHistoryChart/NutritionHistoryChart'
import ProgressCharts from '../ProgressCharts/ProgressCharts'
import ChatMessenger from '../ChatMessenger/ChatMessenger'
import ExerciseLibrary from '../ExerciseLibrary/ExerciseLibrary'
import DailyCheckin from '../DailyCheckin/DailyCheckin'
import MealPlanner from '../MealPlanner/MealPlanner'
import ProgressPhotos from '../ProgressPhotos/ProgressPhotos'
import SmartRoutine from '../SmartRoutine/SmartRoutine'
import Challenges from '../Challenges/Challenges'
import Achievements from '../Achievements/Achievements'
import Leaderboard from '../Leaderboard/Leaderboard'
import SettingsPanel from '../Settings/Settings'
import SocialFeed from '../SocialFeed/SocialFeed'
import LiveSessions from '../LiveSessions/LiveSessions'
import SubscriptionPlans from '../SubscriptionPlans/SubscriptionPlans'
import ClientGoals from '../ClientGoals/ClientGoals'
import WorkoutHeatmap from '../WorkoutHeatmap/WorkoutHeatmap'
import TDEECalculator from '../TDEECalculator/TDEECalculator'
import ProgressSlider from '../ProgressPhotos/ProgressSlider'

import Sidebar from '../Sidebar/Sidebar'
import './ClientDashboard.css'
import { Counter } from '../Counter'

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
    { type: 'item', label: 'Messages', icon: MessageCircle, badge: 3 },
    { type: 'item', label: 'Live Sessions', icon: Video },
    { type: 'item', label: 'Social Feed', icon: Users },
    { type: 'item', label: 'Exercises', icon: Dumbbell },
    { type: 'item', label: 'Leaderboard', icon: Users },
    { type: 'item', label: 'Achievements', icon: Award },
    { type: 'item', label: 'Challenges', icon: Target },
    { type: 'heading', label: 'Account' },
    { type: 'item', label: 'Profile', icon: User },
    { type: 'item', label: 'Settings', icon: Settings },
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
    const [profileModalOpen, setProfileModalOpen] = useState(false)
    const [activeNav, setActiveNav] = useState('Dashboard')
    const [waterCount, setWaterCount] = useState(0)
    const [mealChecked, setMealChecked] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [countersVisible, setCountersVisible] = useState(false)
    const [barAnimated, setBarAnimated] = useState(false)
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)

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

    useEffect(() => {
        apiFetch('/dashboard/client')
            .then(d => {
                setData(d)
                if (d.waterCount !== undefined) setWaterCount(d.waterCount)
                if (d.mealChecked) setMealChecked(d.mealChecked)
            })
            .catch(() => showToast('Error loading data'))
            .finally(() => setLoading(false))
    }, [showToast])

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
            setProfileModalOpen(true)
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

    return (
        <div className="client-dashboard cl-grid-bg cl-noise">
            <div className="cl-cursor-dot" ref={cursorDotRef} />
            <div className="cl-cursor-ring" ref={cursorRingRef} />

            <Sidebar
                items={navSections}
                activeNav={activeNav}
                onNavClick={handleNavClick}
                userName={data?.userName || 'Athlete'}
                userSubtitle="PRO PLAN"
                avatarUrl="https://picsum.photos/seed/user-1/80/80.jpg"
                role="client"
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
                    <div className="cl-spinner" />
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
                        <header className="cl-header">
                            <div className="cl-header-inner">
                                <div className="cl-header-left">
                                    <div className="cl-search-wrap">
                                        <Search className="cl-search-icon" />
                                        <input type="text" placeholder="Search workouts, exercises..." className="cl-search-input" />
                                    </div>
                                </div>
                                <div className="cl-header-right">
                                    <div className="cl-notif-wrap" ref={notifBtnRef} onClick={() => setNotifOpen(!notifOpen)}>
                                        <Bell className="cl-notif-bell" />
                                        <div className="cl-notif-dot" />
                                    </div>
                                    <div className="cl-avatar-wrap">
                                        <img loading="lazy" src="https://picsum.photos/seed/user-1/36/36.jpg" alt="User avatar" className="cl-avatar" />
                                        <ChevronDown className="cl-avatar-chevron" />
                                    </div>
                                </div>
                            </div>
                        </header>
                        <div className="cl-content">
                    <div className="cl-space">
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
                                            Keep pushing.
                                        </p>
                                    </div>
                                    <button
                                        className="cl-btn cl-btn-primary"
                                        style={{ marginTop: '24px' }}
                                        onClick={() => { if (data?.nextWorkout) setModalOpen(true) }}
                                    >
                                        <Play className="" style={{ width: 16, height: 16 }} /> Start Today's Workout
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
                                            {data?.kpis?.workouts?.split('/')[0] || '0'}<span className="cl-kpi-value-sub">/{data?.kpis?.workouts?.split('/')[1] || '6'}</span>
                                        </div>
                                        <div className="cl-kpi-label">Workouts this week</div>
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
                                    <p style={{ color: '#737373', fontSize: 12, marginBottom: 16 }}>Coach: {data?.activeProgram?.coach || '—'} · {data?.activeProgram?.duration || ''}</p>
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
                                                <div className="cl-prog-bar-fill cl-green" style={{ width: barAnimated ? '72%' : '0%' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button className="cl-prog-link" onClick={() => setActiveNav('Programs')}>View Full Program →</button>
                            </div>

                                    <div className="cl-card">
                                <div className="cl-section-hdr">
                                    <h3 className="cl-section-title">This Week</h3>
                                    <span className="cl-section-sub">Total: <span style={{ color: '#4ade80', marginLeft: 4 }}>{data?.kpis?.totalHours || 0}h</span></span>
                                </div>
                                <div className="cl-weekly-chart">
                                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => (
                                        <div key={day} className="cl-bar-col">
                                            <span className="cl-bar-label">{day}</span>
                                            <div
                                                className={'cl-bar-fill' + (i < 5 ? ' cl-active' : ' cl-dim')}
                                                style={{ height: barAnimated ? (i < 5 ? 60 + Math.sin(i * 10) * 20 + 60 : 8) + '%' : '0%' }}
                                            />
                                            <span className={'cl-bar-value' + (i >= 5 ? ' cl-dim' : '')}>{i < 5 ? '—' : '—'}</span>
                                        </div>
                                    ))}
                                </div>
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
                                <div className="cl-next-bg">
                                    <img loading="lazy" src="https://picsum.photos/seed/fitpower-hiit/600/400.jpg" alt="Workout preview" />
                                </div>
                                <div className="cl-next-overlay" />
                                <div className="cl-next-content">
                                    <span className="cl-next-badge">Next up</span>
                                    <h4 className="cl-next-title">{data?.nextWorkout?.title || 'No upcoming workout'}</h4>
                                    <p className="cl-next-desc">{data?.nextWorkout?.desc || 'Rest and recover'}</p>
                                    {data?.nextWorkout && (
                                        <div className="cl-next-coach">
                                            <img loading="lazy" src="https://picsum.photos/seed/coach-alex/60/60.jpg" alt="Coach" className="cl-next-coach-img" />
                                            <div>
                                                <div className="cl-next-coach-name">{data.nextWorkout.coach}</div>
                                                <div className="cl-next-coach-time">Starts at {data.nextWorkout.startsAt}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* ═══ SMART ROUTINE ═══ */}
                        <section className="cl-fade-d3">
                            <SmartRoutine />
                        </section>

                        {/* ═══ BODY METRICS + MEAL PLAN ═══ */}
                        <section className="cl-grid-4 cl-fade-d3">
                            <div className="cl-card-static">
                                <div className="cl-section-hdr">
                                    <h3 className="cl-section-title-sm">Body Metrics</h3>
                                    <span className="cl-section-sub">Updated 3 days ago</span>
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
                                <button
                                    className="" style={{ color: 'var(--power-500)', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 4 }}
                                    onClick={() => showToast('All activity shown below')}
                                >
                                    View all <ArrowRight style={{ width: 16, height: 16 }} />
                                </button>
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
    ) : activeNav === 'Messages' ? (
        <div className={`cl-messages-view ${sidebarCollapsed ? 'cl-messages-collapsed' : ''}`}>
            <ChatMessenger />
        </div>
    ) : activeNav === 'Live Sessions' ? (
        <LiveSessions role="client" />
    ) : activeNav === 'Exercises' ? (
        <ExerciseLibrary />
    ) : activeNav === 'Daily Check-in' || activeNav === 'Goals' ? (
        <div className="cl-combined-health">
            <DailyCheckin />
            <ClientGoals />
        </div>
    ) : activeNav === 'Meal Planner' ? (
        <MealPlanner />
    ) : activeNav === 'Progress Photos' ? (
        <ProgressPhotos />
    ) : activeNav === 'Settings' ? (
        <SettingsPanel />
    ) : activeNav === 'Goals' ? (
        <ClientGoals />
    ) : activeNav === 'Macro Calculator' ? (
        <TDEECalculator />
    ) : activeNav === 'Leaderboard' ? (
        <Leaderboard />
    ) : activeNav === 'Achievements' ? (
<Achievements onShare={true} />
    ) : activeNav === 'Social Feed' ? (
        <div className="cl-social-feed-view">
            <header className="cl-header">
                <div className="cl-header-inner">
                    <div className="cl-header-left">
                        <div className="cl-search-wrap">
                            <Search className="cl-search-icon" />
                            <input type="text" placeholder="Search workouts, exercises..." className="cl-search-input" />
                        </div>
                    </div>
                    <div className="cl-header-right">
                        <div className="cl-notif-wrap" ref={notifBtnRef} onClick={() => setNotifOpen(!notifOpen)}>
                            <Bell className="cl-notif-bell" />
                            <div className="cl-notif-dot" />
                        </div>
                        <div className="cl-avatar-wrap">
                            <img loading="lazy" src="https://picsum.photos/seed/user-1/36/36.jpg" alt="User avatar" className="cl-avatar" />
                            <ChevronDown className="cl-avatar-chevron" />
                        </div>
                    </div>
                </div>
            </header>
            <div className="cl-content">
                <div className="cl-space">
                    <SocialFeed />
                    <div className="cl-spacer" />
                </div>
            </div>
        </div>
    ) : activeNav === 'Challenges' ? (
        <Challenges />
    ) : activeNav === 'Upgrade Plan' ? (
        <div className="cl-upgrade-view">
            <header className="cl-header">
                <div className="cl-header-inner">
                    <div className="cl-header-left">
                        <div className="cl-search-wrap">
                            <Search className="cl-search-icon" />
                            <input type="text" placeholder="Search workouts, exercises..." className="cl-search-input" />
                        </div>
                    </div>
                    <div className="cl-header-right">
                        <div className="cl-notif-wrap" ref={notifBtnRef} onClick={() => setNotifOpen(!notifOpen)}>
                            <Bell className="cl-notif-bell" />
                            <div className="cl-notif-dot" />
                        </div>
                        <div className="cl-avatar-wrap">
                            <img loading="lazy" src="https://picsum.photos/seed/user-1/36/36.jpg" alt="User avatar" className="cl-avatar" />
                            <ChevronDown className="cl-avatar-chevron" />
                        </div>
                    </div>
                </div>
            </header>
            <div className="cl-content">
                <div className="cl-space">
                    <SubscriptionPlans />
                    <div className="cl-spacer" />
                </div>
            </div>
        </div>
    ) : (
        <>
            <header className="cl-header">
                <div className="cl-header-inner">
                    <div className="cl-header-left">
                        <div className="cl-search-wrap">
                            <Search className="cl-search-icon" />
                            <input type="text" placeholder="Search workouts, exercises..." className="cl-search-input" />
                        </div>
                    </div>
                    <div className="cl-header-right">
                        <div className="cl-notif-wrap" ref={notifBtnRef} onClick={() => setNotifOpen(!notifOpen)}>
                            <Bell className="cl-notif-bell" />
                            <div className="cl-notif-dot" />
                        </div>
                        <div className="cl-avatar-wrap">
                            <img loading="lazy" src="https://picsum.photos/seed/user-1/36/36.jpg" alt="User avatar" className="cl-avatar" />
                            <ChevronDown className="cl-avatar-chevron" />
                        </div>
                    </div>
                </div>
            </header>
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
                        <img loading="lazy" src="https://picsum.photos/seed/fitpower-upper/800/400.jpg" alt="Activity preview" className="cl-modal-img" />
                        <div className="cl-modal-img-overlay" />
                        <button className="cl-modal-close-btn" onClick={() => setModalOpen(false)}><X /></button>
                        <div className="cl-modal-img-content">
                            <span className="cl-modal-tag">Strength · Upper Body</span>
                            <h3 className="cl-modal-img-title">Upper Body Power</h3>
                            <p className="cl-modal-img-sub">Coach Alex · 50 min · Intermediate</p>
                        </div>
                    </div>
                    <div className="cl-modal-body">
                        <div className="cl-modal-stats">
                            <div className="cl-modal-stat">
                                <div className="cl-modal-stat-value">12</div>
                                <div className="cl-modal-stat-label">Exercises</div>
                            </div>
                            <div className="cl-modal-stat">
                                <div className="cl-modal-stat-value cl-yellow">4</div>
                                <div className="cl-modal-stat-label">Supersets</div>
                            </div>
                            <div className="cl-modal-stat">
                                <div className="cl-modal-stat-value">~520</div>
                                <div className="cl-modal-stat-label">Calories</div>
                            </div>
                        </div>
                        <div className="cl-modal-exercises">
                            {[
                                'Bench Press — 4×10 @ 70% 1RM',
                                'Incline Dumbbell Press — 3×12',
                                'Cable Flyes — 3×15',
                                'Lateral Raises — 3×12',
                                'Tricep Pushdowns — 3×15',
                            ].map((ex, i) => (
                                <div key={i} className="cl-modal-ex">
                                    <div className="cl-modal-ex-num">{i + 1}</div>
                                    <span className="cl-modal-ex-text">{ex}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            className="cl-modal-start"
                            onClick={() => { setModalOpen(false) }}
                        >
                            Start Workout Session
                        </button>
                    </div>
                </div>
            </div>
            <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} onSaved={() => {
                apiFetch('/dashboard/client').then(d => { setData(d); if (d.waterCount !== undefined) setWaterCount(d.waterCount); if (d.mealChecked) setMealChecked(d.mealChecked) })
            }} />
        </div>
    )
}
