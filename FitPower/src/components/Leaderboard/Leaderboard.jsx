import { useState, useEffect } from 'react'
import { Trophy, Dumbbell, Flame, Medal, Target, Zap, Award, Users } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import './Leaderboard.css'

const rankIcons = [Medal, Medal, Medal]
const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']

export default function Leaderboard() {
    const { showToast } = useToast()
    const [entries, setEntries] = useState([])
    const [userRank, setUserRank] = useState(null)
    const [stats, setStats] = useState(null)
    const [period, setPeriod] = useState('total')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            apiFetch(`/leaderboard?period=${period}`),
            apiFetch('/leaderboard/stats').catch(() => null)
        ])
            .then(([d, s]) => {
                setEntries(d.entries || [])
                setUserRank(d.userRank || null)
                setStats(s || {})
            })
            .catch(() => { showToast('Error loading leaderboard') })
            .finally(() => setLoading(false))
    }, [period, showToast])

    const periods = [
        { key: 'total', label: 'Total', icon: Trophy },
        { key: 'workouts', label: 'Workouts', icon: Dumbbell },
        { key: 'streak', label: 'Streak', icon: Flame },
        { key: 'calories', label: 'Calories', icon: Target },
        { key: 'points', label: 'Points', icon: Zap },
    ]

    return (
        <div className="lb-page">
            <div className="lb-header">
                <Trophy className="lb-header-icon" />
                <h1 className="lb-title">Leaderboard</h1>
                <p className="lb-subtitle">Compete with other athletes and climb the rankings</p>
            </div>
            <div className="container">
                {stats && (
                    <div className="lb-stats">
                        <div className="lb-stat-card">
                            <Users className="lb-stat-icon" />
                            <div className="lb-stat-value">{stats.total_users || 0}</div>
                            <div className="lb-stat-label">Active Athletes</div>
                        </div>
                        <div className="lb-stat-card">
                            <Dumbbell className="lb-stat-icon" />
                            <div className="lb-stat-value">{stats.total_workouts || 0}</div>
                            <div className="lb-stat-label">Total Workouts</div>
                        </div>
                        <div className="lb-stat-card">
                            <Zap className="lb-stat-icon" />
                            <div className="lb-stat-value">{stats.total_points || 0}</div>
                            <div className="lb-stat-label">Total Points</div>
                        </div>
                        <div className="lb-stat-card">
                            <Flame className="lb-stat-icon" />
                            <div className="lb-stat-value">{stats.top_streak || 0}</div>
                            <div className="lb-stat-label">Best Streak</div>
                        </div>
                    </div>
                )}
                <div className="lb-periods">
                    {periods.map(p => (
                        <button key={p.key} className={`lb-period ${period === p.key ? 'active' : ''}`} onClick={() => setPeriod(p.key)}>
                            <p.icon size={16} /> {p.label}
                        </button>
                    ))}
                </div>
                {userRank && (
                    <div className="lb-user-card">
                        <div className="lb-user-rank">#{userRank.rank}</div>
                        <div className="lb-user-info">
                            <div className="lb-user-name">{userRank.user_name}</div>
                            <div className="lb-user-stats">
                                <span><Trophy size={12} /> {userRank.total_points} pts</span>
                                <span><Dumbbell size={12} /> {userRank.workouts_completed}</span>
                                <span><Flame size={12} /> {userRank.streak_days} days</span>
                                <span><Award size={12} /> {userRank.achievements_count || 0} achievements</span>
                            </div>
                        </div>
                    </div>
                )}
                <div className="lb-list">
                    {loading ? <p className="lb-loading">Loading...</p> : entries.length === 0 ? (
                        <p className="lb-empty">No data yet. Complete workouts to appear here!</p>
                    ) : entries.map((e, i) => {
                        const RankIcon = rankIcons[i] || null
                        const isUser = userRank && e.user_id === userRank.user_id
                        return (
                            <div key={e.id || i} className={`lb-entry ${isUser ? 'lb-current' : ''}`}>
                                <div className="lb-rank">
                                    {i < 3 ? (
                                        <RankIcon size={24} color={rankColors[i]} fill={rankColors[i]} />
                                    ) : (
                                        <span className="lb-rank-num">#{e.rank || i + 1}</span>
                                    )}
                                </div>
                                <div className="lb-entry-avatar" style={{ background: `hsl(${e.user_id * 40}, 60%, 50%)` }}>
                                    {e.user_name?.[0]}
                                </div>
                                <div className="lb-entry-info">
                                    <div className="lb-entry-name">{e.user_name}</div>
                                    <div className="lb-entry-detail">
                                        {e.workouts_completed} workouts · {e.streak_days} day streak
                                        {e.achievements_count > 0 && <span className="lb-entry-badge"> <Award size={10} /> {e.achievements_count} achievements</span>}
                                    </div>
                                </div>
                                <div className="lb-entry-meta">
                                    {e.followers_count > 0 && (
                                        <span className="lb-entry-followers"><Users size={12} /> {e.followers_count}</span>
                                    )}
                                </div>
                                <div className="lb-entry-points">
                                    <Zap size={14} />
                                    <span>{e.total_points}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
