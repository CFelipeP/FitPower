import { useState, useEffect, useRef } from 'react'
import { Bell, MessageCircle, Award, CalendarCheck, Dumbbell, AlertCircle, CheckCheck, Clock } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import './NotificationsDropdown.css'

const typeIcons = {
    message: MessageCircle,
    achievement: Award,
    reminder: CalendarCheck,
    workout: Dumbbell,
    alert: AlertCircle,
}

export default function NotificationsDropdown({ isOpen, onClose, notifRef, notifBtnRef }) {
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(false)
    const { showToast } = useToast()
    const hasFetched = useRef(false)

    useEffect(() => {
        if (isOpen && !hasFetched.current) {
            hasFetched.current = true
            setLoading(true)
            apiFetch('/notifications')
                .then(setNotifications)
                .catch(() => showToast('Error loading notifications'))
                .finally(() => setLoading(false))
        }
    }, [isOpen, showToast])

    useEffect(() => {
        if (!isOpen) {
            hasFetched.current = false
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target) &&
                notifBtnRef.current && !notifBtnRef.current.contains(e.target)) {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose, notifRef, notifBtnRef])

    const unreadCount = notifications.filter((n) => !n.read_at).length

    const markAsRead = async (id) => {
        try {
            await apiFetch(`/notifications/${id}/read`, { method: 'POST' })
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
            )
        } catch {
            showToast('Error marking notification as read')
        }
    }

    const markAllAsRead = async () => {
        try {
            await apiFetch('/notifications/read-all', { method: 'POST' })
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            )
            showToast('All notifications marked as read')
        } catch {
            showToast('Error marking all as read')
        }
    }

    const timeAgo = (dateStr) => {
        const now = new Date()
        const date = new Date(dateStr)
        const diffMs = now - date
        const mins = Math.floor(diffMs / 60000)
        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        const days = Math.floor(hrs / 24)
        if (days < 7) return `${days}d ago`
        return date.toLocaleDateString()
    }

    if (!isOpen) return null

    return (
        <div className="nd-overlay">
            <div className="nd-dropdown" ref={notifRef}>
                <div className="nd-header">
                    <div className="nd-header-left">
                        <Bell size={18} />
                        <span>Notifications</span>
                        {unreadCount > 0 && <span className="nd-badge">{unreadCount}</span>}
                    </div>
                    {unreadCount > 0 && (
                        <button className="nd-mark-all" onClick={markAllAsRead}>
                            <CheckCheck size={14} />
                            Mark all read
                        </button>
                    )}
                </div>

                <div className="nd-list">
                    {loading ? (
                        <div className="nd-empty">
                            <Clock size={24} />
                            <p>Loading notifications...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="nd-empty">
                            <Bell size={24} />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((n) => {
                            const Icon = typeIcons[n.type] || Bell
                            return (
                                <div
                                    key={n.id}
                                    className={`nd-item ${!n.read_at ? 'nd-unread' : ''}`}
                                    onClick={() => !n.read_at && markAsRead(n.id)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    {!n.read_at && <span className="nd-dot" />}
                                    <div className="nd-icon-wrap">
                                        <Icon size={18} />
                                    </div>
                                    <div className="nd-content">
                                        <div className="nd-title">{n.title}</div>
                                        {n.body && <div className="nd-body">{n.body}</div>}
                                        <div className="nd-time">{timeAgo(n.created_at)}</div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
