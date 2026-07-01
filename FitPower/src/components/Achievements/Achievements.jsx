import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { Trophy, Award, Zap, Dumbbell, Flame, Target, Users, MessageCircle, Crown, Lock, Share2 } from 'lucide-react'
import ShareModal from './ShareModal'
import './Achievements.css'

const iconMap = {
    Trophy, Award, Zap, Dumbbell, Flame, Target, Users, MessageCircle, Crown,
    Activity: Dumbbell, CalendarDays: Trophy, Clock: Flame,
}

export default function Achievements({ compact = false, onShare }) {
    const [achievements, setAchievements] = useState([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [sharing, setSharing] = useState(null)

    useEffect(() => {
        apiFetch('/achievements').then(setAchievements).catch(() => {}).finally(() => setLoading(false))
        apiFetch('/leaderboard').then(d => {
            if (d.length) setStats(d.find(e => e.userId || e.user_id) || d[0])
        }).catch(() => {})
    }, [])

    const unlocked = achievements.filter(a => a.unlocked)
    const locked = achievements.filter(a => !a.unlocked)
    const totalPoints = unlocked.reduce((sum, a) => sum + (a.points || 0), 0)

    if (loading) return <div className="achievements-loading"><div className="skeleton-pulse" style={{height: compact ? 60 : 200}}></div></div>

    return (
        <>
        {sharing && <ShareModal achievement={sharing} onClose={() => setSharing(null)} />}
        <div className={`achievements ${compact ? 'achievements-compact' : ''}`}>
            {!compact && (
                <div className="achievements-header">
                    <div className="achievements-header-left">
                        <Trophy size={20} className="achievements-header-icon" />
                        <h3 className="achievements-title">Achievements</h3>
                    </div>
                    <span className="achievements-count">{unlocked.length}/{achievements.length}</span>
                </div>
            )}
            {compact ? (
                <div className="achievements-badges-row">
                    {unlocked.slice(0, 5).map(a => {
                        const Icon = iconMap[a.icon] || Award
                        return (
                            <div key={a.id} className="achievement-badge unlocked" title={a.name + ': ' + a.description}>
                                <Icon size={compact ? 18 : 22} />
                            </div>
                        )
                    })}
                    {unlocked.length > 5 && (
                        <div className="achievement-badge-more">+{unlocked.length - 5}</div>
                    )}
                    {unlocked.length === 0 && (
                        <span className="achievements-empty">Complete workouts to earn achievements</span>
                    )}
                </div>
            ) : (
                <div className="achievements-list">
                    {unlocked.map(a => {
                        const Icon = iconMap[a.icon] || Award
                        return (
                            <div key={a.id} className="achievement-item unlocked">
                                <div className="achievement-icon-wrap">
                                    <Icon size={20} />
                                </div>
                                <div className="achievement-info">
                                    <div className="achievement-name">{a.name}</div>
                                    <div className="achievement-desc">{a.description}</div>
                                </div>
                                <div className="achievement-points">+{a.points}pts</div>
                                {onShare && (
                                    <button className="achievement-share-btn" onClick={() => setSharing(a)} title="Share">
                                        <Share2 size={14} />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                    {locked.map(a => {
                        return (
                            <div key={a.id} className="achievement-item locked">
                                <div className="achievement-icon-wrap">
                                    <Lock size={20} />
                                </div>
                                <div className="achievement-info">
                                    <div className="achievement-name">{a.name}</div>
                                    <div className="achievement-desc">{a.description}</div>
                                </div>
                                <div className="achievement-locked-icon"><Lock size={14} /></div>
                            </div>
                        )
                    })}
                </div>
            )}
            {!compact && stats && (
                <div className="achievements-stats">
                    <div className="achievement-stat">
                        <span className="achievement-stat-label">Total Points</span>
                        <span className="achievement-stat-value">{stats.points || totalPoints}</span>
                    </div>
                    <div className="achievement-stat">
                        <span className="achievement-stat-label">Workouts</span>
                        <span className="achievement-stat-value">{stats.workouts_completed || 0}</span>
                    </div>
                    <div className="achievement-stat">
                        <span className="achievement-stat-label">Streak</span>
                        <span className="achievement-stat-value">{stats.streak_days || 0} days</span>
                    </div>
                </div>
            )}
        </div>
        </>
    )
}
