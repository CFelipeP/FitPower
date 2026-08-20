import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    LayoutDashboard, CalendarDays, Dumbbell, Utensils,
    BarChart3, Target, Settings, Users, MessageCircle,
    Heart, User, Camera, Video, Calculator, LogOut,
    Crown, Wallet, UserCheck, CreditCard, Mail, ListChecks,
    Zap,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../Sidebar/Sidebar'
import '../DashboardShared.css'

const CLIENT_NAV = [
    { type: 'heading', label: 'Main' },
    { type: 'item', label: 'Dashboard', icon: LayoutDashboard },
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
    { type: 'item', label: 'Exercises', icon: Dumbbell },
    { type: 'item', label: 'Leaderboard', icon: Users },
    { type: 'heading', label: 'Account' },
    { type: 'item', label: 'Profile', icon: User },
    { type: 'item', label: 'Settings', icon: Settings },
    { type: 'item', label: 'Support', icon: MessageCircle },
    { type: 'item', label: 'Upgrade Plan', icon: Crown },
    { type: 'item', label: 'Log Out', icon: LogOut },
]

const COACH_NAV = [
    { type: 'heading', label: 'Main' },
    { type: 'item', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'item', label: 'Clients', icon: Users },
    { type: 'item', label: 'Schedule', icon: CalendarDays },
    { type: 'item', label: 'Programs', icon: ListChecks },
    { type: 'item', label: 'Training Videos', icon: Video },
    { type: 'heading', label: 'Support' },
    { type: 'item', label: 'Support Tickets', icon: Mail },
    { type: 'heading', label: 'Account' },
    { type: 'item', label: 'Earnings', icon: Wallet },
    { type: 'item', label: 'Profile', icon: User },
    { type: 'item', label: 'Settings', icon: Settings },
    { type: 'item', label: 'Log Out', icon: LogOut },
]

const ADMIN_NAV = [
    { type: 'heading', label: 'Main' },
    { type: 'item', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'item', label: 'Users', icon: Users },
    { type: 'item', label: 'Coaches', icon: UserCheck },
    { type: 'item', label: 'Subscriptions', icon: CreditCard },
    { type: 'item', label: 'Plans', icon: ListChecks },
    { type: 'item', label: 'Coupons', icon: Zap },
    { type: 'item', label: 'Messages', icon: Mail },
    { type: 'item', label: 'Log Out', icon: LogOut },
]

const ROUTES = {
    client: {
        Dashboard: '/client/dashboard',
        Programs: '/client/dashboard',
        Workouts: '/client/dashboard',
        Nutrition: '/client/nutrition',
        Progress: '/client/dashboard',
        'Daily Check-in': '/client/dashboard',
        Goals: '/client/goals',
        'Macro Calculator': '/client/dashboard',
        'Meal Planner': '/client/dashboard',
        'Progress Photos': '/client/dashboard',
        'Training Videos': '/client/dashboard',
        'Social Feed': '/forum',
        Exercises: '/client/dashboard',
        Leaderboard: '/leaderboard',
        Profile: '/client/dashboard',
        Settings: '/settings',
        Support: '/client/dashboard',
        'Upgrade Plan': '/plans',
        'Log Out': null,
    },
    coach: {
        Dashboard: '/coach/dashboard',
        Clients: '/coach/dashboard',
        Schedule: '/coach/dashboard',
        Programs: '/coach/dashboard',
        'Training Videos': '/coach/dashboard',
        'Support Tickets': '/coach/tickets',
        Earnings: '/coach/dashboard',
        Profile: '/coach/dashboard',
        Settings: '/settings',
        'Log Out': null,
    },
    admin: {
        Dashboard: '/admin/dashboard',
        Users: '/admin/users',
        Coaches: '/admin/dashboard',
        Subscriptions: '/admin/dashboard',
        Plans: '/admin/dashboard',
        Coupons: '/admin/dashboard',
        Messages: '/admin/dashboard',
        'Log Out': null,
    },
}

const NAV_BY_ROLE = { client: CLIENT_NAV, coach: COACH_NAV, admin: ADMIN_NAV }

const ACTIVE_LABEL_BY_PATH = {
    '/plans': 'Upgrade Plan',
    '/checkout': 'Upgrade Plan',
    '/payment/success': 'Upgrade Plan',
    '/payment/cancel': 'Upgrade Plan',
    '/forum': 'Social Feed',
    '/leaderboard': 'Leaderboard',
    '/settings': 'Settings',
    '/client/goals': 'Goals',
    '/client/nutrition': 'Nutrition',
    '/coach/tickets': 'Support Tickets',
}

export default function SessionShell({ children }) {
    const { isAuthenticated, user, logout: authLogout } = useAuth()
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    const handleNavClick = useCallback((label) => {
        const role = user?.role || 'client'
        const route = (ROUTES[role] || ROUTES.client)[label]
        if (label === 'Log Out') {
            authLogout()
            navigate('/')
            return
        }
        if (route) navigate(route)
        setMobileOpen(false)
    }, [authLogout, navigate, user])

    const handleToggle = useCallback(() => {
        if (window.innerWidth <= 1024) {
            setMobileOpen(o => !o)
        } else {
            setCollapsed(c => !c)
        }
    }, [])

    if (!isAuthenticated) {
        return children
    }

    const role = user?.role || 'client'
    const items = NAV_BY_ROLE[role] || CLIENT_NAV
    const activeLabel = ACTIVE_LABEL_BY_PATH[window.location.pathname] || 'Dashboard'

    return (
        <div className="client-dashboard cl-grid-bg cl-noise">
            <Sidebar
                items={items}
                activeNav={activeLabel}
                onNavClick={handleNavClick}
                userName={user?.firstName || (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User')}
                userSubtitle={role.charAt(0).toUpperCase() + role.slice(1)}
                avatarUrl={user?.photo || ''}
                collapsed={collapsed}
                onToggle={handleToggle}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />
            <main className="cl-main" style={{ marginLeft: collapsed ? 64 : 260 }}>
                {children}
            </main>
        </div>
    )
}
