import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, MessageCircle, Award, CalendarCheck, Dumbbell, AlertCircle, CheckCheck, Clock, Trash2, ChevronDown } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { confirmSwal } from '../../lib/alerts'
import './NotificationsDropdown.css'

const typeIcons = {
    message: MessageCircle,
    achievement: Award,
    reminder: CalendarCheck,
    workout: Dumbbell,
    routine: Dumbbell,
    alert: AlertCircle,
    streak_risk: AlertCircle,
    goal: Award,
    weekly_summary: CalendarCheck,
    video_invite: MessageCircle,
    subscription: AlertCircle,
    ticket: MessageCircle,
    account: AlertCircle,
}

export default function NotificationsDropdown({ isOpen, onClose, notifRef, notifBtnRef }) {
    const [notifications, setNotifications] = useState([])
    const [hasMore, setHasMore] = useState(false)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [position, setPosition] = useState({})
    const { showToast } = useToast()
    const navigate = useNavigate()
    const hasFetched = useRef(false)

    useEffect(() => {
        if (!isOpen) return
        const updatePosition = () => {
            const btn = notifBtnRef?.current
            const isMobile = window.innerWidth <= 640
            if (!btn) {
                setPosition(isMobile
                    ? { position: 'fixed', top: 60, left: 12, right: 12 }
                    : { position: 'fixed', top: 72, right: 24 })
                return
            }
            const rect = btn.getBoundingClientRect()
            const gap = 8
            const maxTop = Math.max(8, window.innerHeight - 56)
            if (isMobile) {
                setPosition({
                    position: 'fixed',
                    top: Math.min(rect.bottom + gap, maxTop),
                    left: 12,
                    right: 12,
                    width: 'auto',
                    maxWidth: 'none',
                })
            } else {
                const right = Math.max(12, window.innerWidth - rect.right)
                setPosition({
                    position: 'fixed',
                    top: Math.min(rect.bottom + gap, maxTop),
                    right: Math.min(right, 32),
                })
            }
        }
        updatePosition()
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)
        return () => {
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition, true)
        }
    }, [isOpen, notifBtnRef])

    const loadPage = (nextPage, append = false) => {
        setLoading(true)
        apiFetch(`/notifications?page=${nextPage}&perPage=20`)
            .then(data => {
                const list = data?.notifications || []
                setNotifications(prev => (append ? [...prev, ...list] : list))
                setHasMore(!!data?.hasMore)
                setPage(nextPage)
            })
            .catch(() => showToast('Error loading notifications'))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        if (isOpen && !hasFetched.current) {
            hasFetched.current = true
            loadPage(1)
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

    const deleteNotification = async (id, e) => {
        e.stopPropagation()
        try {
            await apiFetch(`/notifications/${id}`, { method: 'DELETE' })
            setNotifications(prev => prev.filter(n => n.id !== id))
        } catch {
            showToast('Error deleting notification')
        }
    }

    const clearAll = async () => {
        if (!(await confirmSwal('All your notifications will be permanently deleted.', 'Clear all notifications?'))) return
        try {
            await apiFetch('/notifications', { method: 'DELETE' })
            setNotifications([])
            setHasMore(false)
            showToast('Notifications cleared')
        } catch {
            showToast('Error clearing notifications')
        }
    }

    const handleItemClick = (n) => {
        if (!n.read_at) markAsRead(n.id)
        if (n.link) {
            onClose()
            navigate(n.link)
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
        <div className="nd-overlay" onClick={onClose}>
            <div className="nd-dropdown" ref={notifRef} style={position} onClick={(e) => e.stopPropagation()}>
                <div className="nd-header">
                    <div className="nd-header-left">
                        <Bell size={18} />
                        <span>Notifications</span>
                        {unreadCount > 0 && <span className="nd-badge">{unreadCount}</span>}
                    </div>
                    <div className="nd-header-actions">
                        {unreadCount > 0 && (
                            <button className="nd-mark-all" onClick={markAllAsRead}>
                                <CheckCheck size={14} />
                                Mark all read
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button className="nd-mark-all" onClick={clearAll} title="Clear all">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="nd-list">
                    {loading && notifications.length === 0 ? (
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
                        <>
                            {notifications.map((n) => {
                                const Icon = typeIcons[n.type] || Bell
                                return (
                                    <div
                                        key={n.id}
                                        className={`nd-item ${!n.read_at ? 'nd-unread' : ''}`}
                                        onClick={() => handleItemClick(n)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                handleItemClick(n)
                                            }
                                        }}
                                    >
                                        {!n.read_at && <span className="nd-dot" />}
                                        <div className="nd-icon-wrap">
                                            <Icon size={18} />
                                        </div>
                                        <div className="nd-content">
                                            <div className="nd-title">{n.title}</div>
                                            {n.body && <div className="nd-body">{n.body}</div>}
                                            <div className="nd-time">{timeAgo(n.createdAt || n.created_at)}</div>
                                        </div>
                                        <button className="nd-delete" onClick={(e) => deleteNotification(n.id, e)} title="Delete">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                )
                            })}
                            {hasMore && (
                                <button className="nd-load-more" onClick={() => loadPage(page + 1, true)} disabled={loading}>
                                    <ChevronDown size={14} /> Load more
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
