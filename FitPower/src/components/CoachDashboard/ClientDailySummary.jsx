import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import {
    User, Calendar, CheckCircle, Target, Activity,
    Dumbbell, Apple, Camera, Award, TrendingUp,
    Moon, Zap, Droplets, Flame,
    Clock, Medal, Heart, Bell,
    CalendarCheck, Timer
} from 'lucide-react'
import './ClientDailySummary.css'

export default function ClientDailySummary({ clientId }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!clientId) return
        setLoading(true)
        apiFetch(`/coach/client/${clientId}/daily-summary`)
            .then(setData)
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [clientId])

    if (loading) {
        return (
            <div className="cds-loading">
                <div className="cds-spinner" />
                <p>Loading client data...</p>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="cds-empty">
                <User size={48} />
                <h3>No data available</h3>
                <p>Could not load client summary</p>
            </div>
        )
    }

    const mealLabels = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

    return (
        <div className="cds-page">
            <div className="cds-header">
                <div className="cds-avatar">
                    {data.userName?.[0] || '?'}
                </div>
                <div>
                    <h1 className="cds-title">{data.userName}</h1>
                    <p className="cds-subtitle">{data.email}</p>
                </div>
            </div>

            {/* ══ KPIs ══ */}
            {data.kpis && (
                <section className="cds-section">
                    <h2 className="cds-section-title"><Activity size={18} /> Overview</h2>
                    <div className="cds-kpis">
                        <div className="cds-kpi-card">
                            <div className="cds-kpi-icon-box cds-kpi-blue"><CalendarCheck size={20} /></div>
                            <div className="cds-kpi-value">{data.kpis.workouts}</div>
                            <div className="cds-kpi-label">Workouts This Month</div>
                        </div>
                        <div className="cds-kpi-card">
                            <div className="cds-kpi-icon-box cds-kpi-green"><Timer size={20} /></div>
                            <div className="cds-kpi-value">{data.kpis.totalHours}h</div>
                            <div className="cds-kpi-label">Total Hours</div>
                        </div>
                        <div className="cds-kpi-card">
                            <div className="cds-kpi-icon-box cds-kpi-yellow"><Flame size={20} /></div>
                            <div className="cds-kpi-value">{data.kpis.streak}</div>
                            <div className="cds-kpi-label">Day Streak</div>
                        </div>
                    </div>
                </section>
            )}

            {/* ══ Check-in ══ */}
            <section className="cds-section">
                <h2 className="cds-section-title"><Calendar size={18} /> Today's Check-in</h2>
                {data.checkin ? (
                    <div className="cds-checkin-grid">
                        <div className="cds-ci-card">
                            <span className="cds-ci-label">Mood</span>
                            <span className="cds-ci-value">
                                {data.checkin.mood === 'great' && '😄 Great'}
                                {data.checkin.mood === 'good' && '🙂 Good'}
                                {data.checkin.mood === 'okay' && '😐 Okay'}
                                {data.checkin.mood === 'bad' && '😞 Bad'}
                                {data.checkin.mood === 'terrible' && '😫 Terrible'}
                                {!['great','good','okay','bad','terrible'].includes(data.checkin.mood) && data.checkin.mood}
                            </span>
                        </div>
                        <div className="cds-ci-card">
                            <span className="cds-ci-label"><Moon size={14} /> Sleep</span>
                            <span className="cds-ci-value">{data.checkin.sleepHours ?? '—'}h</span>
                        </div>
                        <div className="cds-ci-card">
                            <span className="cds-ci-label"><Zap size={14} /> Energy</span>
                            <span className="cds-ci-value">{data.checkin.energyLevel ?? '—'}/10</span>
                        </div>
                        {data.checkin.notes && (
                            <div className="cds-ci-card cds-ci-notes">
                                <span className="cds-ci-label">Notes</span>
                                <p className="cds-ci-notes-text">{data.checkin.notes}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="cds-empty-sm">No check-in recorded today</p>
                )}
            </section>

            {/* ══ Goals ══ */}
            <section className="cds-section">
                <h2 className="cds-section-title"><Target size={18} /> Goals</h2>
                {data.goals?.length > 0 ? (
                    <div className="cds-goals-grid">
                        {data.goals.map(g => (
                            <div key={g.id} className={`cds-goal-card ${g.completed ? 'cds-goal-done' : ''}`}>
                                <div className="cds-goal-hdr">
                                    <span className="cds-goal-title">{g.title}</span>
                                    {g.completed && <CheckCircle size={16} className="cds-goal-check" />}
                                </div>
                                <div className="cds-goal-bar-wrap">
                                    <div className="cds-goal-bar">
                                        <div className="cds-goal-fill" style={{ width: Math.min(g.progress, 100) + '%' }} />
                                    </div>
                                    <span className="cds-goal-pct">{g.progress}%</span>
                                </div>
                                {g.targetValue && (
                                    <p className="cds-goal-target">{g.currentValue ?? 0}/{g.targetValue} {g.unit}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="cds-empty-sm">No goals set</p>
                )}
            </section>

            {/* ══ Active Program ══ */}
            {data.activeProgram && (
                <section className="cds-section">
                    <h2 className="cds-section-title"><Dumbbell size={18} /> Active Program</h2>
                    <div className="cds-program-card">
                        <div className="cds-program-info">
                            <h3 className="cds-program-name">{data.activeProgram.name}</h3>
                            <p className="cds-program-meta">{data.activeProgram.week} · {data.activeProgram.duration}</p>
                            {data.activeProgram.coach && (
                                <p className="cds-program-coach">Coach: {data.activeProgram.coach}</p>
                            )}
                        </div>
                        <div className="cds-program-ring">
                            <svg viewBox="0 0 100 100" className="cds-ring-svg">
                                <circle cx="50" cy="50" r="42" className="cds-ring-bg" />
                                <circle cx="50" cy="50" r="42" className="cds-ring-fg"
                                    style={{
                                        strokeDasharray: `${2 * Math.PI * 42}`,
                                        strokeDashoffset: `${2 * Math.PI * 42 * (1 - data.activeProgram.progress / 100)}`,
                                    }}
                                />
                            </svg>
                            <span className="cds-ring-text">{data.activeProgram.progress}%</span>
                        </div>
                    </div>
                    {data.nextWorkout && (
                        <div className="cds-next-workout">
                            <Clock size={14} />
                            <span>Next: <strong>{data.nextWorkout.title}</strong> on {data.nextWorkout.date}{data.nextWorkout.time ? ` at ${data.nextWorkout.time}` : ''}</span>
                        </div>
                    )}
                </section>
            )}

            {/* ══ Body Metrics ══ */}
            {data.bodyMetrics && (
                <section className="cds-section">
                    <h2 className="cds-section-title"><Activity size={18} /> Body Metrics</h2>
                    <div className="cds-metrics-grid">
                        {data.bodyMetrics.weight && (
                            <div className="cds-metric-card">
                                <Heart size={16} className="cds-metric-icon" />
                                <span className="cds-metric-value">{data.bodyMetrics.weight.value}</span>
                                <span className="cds-metric-unit">{data.bodyMetrics.weight.unit}</span>
                                <span className="cds-metric-label">Weight</span>
                            </div>
                        )}
                        {data.bodyMetrics.bodyFat && (
                            <div className="cds-metric-card">
                                <Activity size={16} className="cds-metric-icon" />
                                <span className="cds-metric-value">{data.bodyMetrics.bodyFat.value}</span>
                                <span className="cds-metric-unit">{data.bodyMetrics.bodyFat.unit}</span>
                                <span className="cds-metric-label">Body Fat</span>
                            </div>
                        )}
                        {data.bodyMetrics.muscle && (
                            <div className="cds-metric-card">
                                <Dumbbell size={16} className="cds-metric-icon" />
                                <span className="cds-metric-value">{data.bodyMetrics.muscle.value}</span>
                                <span className="cds-metric-unit">{data.bodyMetrics.muscle.unit}</span>
                                <span className="cds-metric-label">Muscle</span>
                            </div>
                        )}
                        {data.bodyMetrics.bmi && (
                            <div className="cds-metric-card">
                                <TrendingUp size={16} className="cds-metric-icon" />
                                <span className="cds-metric-value">{data.bodyMetrics.bmi.value}</span>
                                <span className="cds-metric-label">BMI</span>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ══ Nutrition ══ */}
            {data.nutrition && (
                <section className="cds-section">
                    <h2 className="cds-section-title"><Apple size={18} /> Today's Nutrition</h2>
                    <div className="cds-nutrition-summary">
                        <div className="cds-nutri-main">
                            <span className="cds-nutri-label">Calories</span>
                            <span className="cds-nutri-value">{data.nutrition.calories.consumed} / {data.nutrition.calories.target} kcal</span>
                            <div className="cds-nutri-bar">
                                <div className="cds-nutri-fill cds-nutri-fill-orange"
                                    style={{ width: Math.min((data.nutrition.calories.consumed / Math.max(data.nutrition.calories.target, 1)) * 100, 100) + '%' }}
                                />
                            </div>
                        </div>
                        <div className="cds-macro-grid">
                            <div className="cds-macro-item">
                                <span className="cds-macro-label">Protein</span>
                                <span className="cds-macro-value">{data.nutrition.protein.current}/{data.nutrition.protein.target}g</span>
                                <div className="cds-nutri-bar cds-nutri-bar-sm">
                                    <div className="cds-nutri-fill cds-nutri-fill-green"
                                        style={{ width: Math.min((data.nutrition.protein.current / Math.max(data.nutrition.protein.target, 1)) * 100, 100) + '%' }}
                                    />
                                </div>
                            </div>
                            <div className="cds-macro-item">
                                <span className="cds-macro-label">Carbs</span>
                                <span className="cds-macro-value">{data.nutrition.carbs.current}/{data.nutrition.carbs.target}g</span>
                                <div className="cds-nutri-bar cds-nutri-bar-sm">
                                    <div className="cds-nutri-fill cds-nutri-fill-blue"
                                        style={{ width: Math.min((data.nutrition.carbs.current / Math.max(data.nutrition.carbs.target, 1)) * 100, 100) + '%' }}
                                    />
                                </div>
                            </div>
                            <div className="cds-macro-item">
                                <span className="cds-macro-label">Fat</span>
                                <span className="cds-macro-value">{data.nutrition.fat.current}/{data.nutrition.fat.target}g</span>
                                <div className="cds-nutri-bar cds-nutri-bar-sm">
                                    <div className="cds-nutri-fill cds-nutri-fill-purple"
                                        style={{ width: Math.min((data.nutrition.fat.current / Math.max(data.nutrition.fat.target, 1)) * 100, 100) + '%' }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="cds-water-meals">
                            <span className="cds-water"><Droplets size={14} /> {data.nutrition.waterGlasses} glasses</span>
                            <span className="cds-meals">
                                {data.nutrition.mealChecked.map((checked, i) => (
                                    <span key={i} className={`cds-meal-dot ${checked ? 'cds-meal-done' : ''}`} title={mealLabels[i]}>
                                        {checked ? '✓' : '○'}
                                    </span>
                                ))}
                                <span className="cds-meal-label">Meals</span>
                            </span>
                        </div>
                    </div>
                </section>
            )}

            {/* ══ Progress Photos ══ */}
            {data.photos?.length > 0 && (
                <section className="cds-section">
                    <h2 className="cds-section-title"><Camera size={18} /> Recent Progress Photos</h2>
                    <div className="cds-photos-grid">
                        {data.photos.map(p => (
                            <div key={p.id} className="cds-photo-card">
                                <img src={p.photoUrl} alt={`Progress ${p.photoType}`} className="cds-photo-img" />
                                <span className="cds-photo-type">{p.photoType}</span>
                                <span className="cds-photo-date">{new Date(p.takenAt).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ══ Achievements ══ */}
            {data.achievements?.length > 0 && (
                <section className="cds-section">
                    <h2 className="cds-section-title"><Award size={18} /> Achievements</h2>
                    <div className="cds-ach-grid">
                        {data.achievements.map((a, i) => (
                            <div key={i} className={`cds-ach-card ${a.unlocked ? 'cds-ach-unlocked' : 'cds-ach-locked'}`}>
                                <Medal size={20} />
                                <span className="cds-ach-label">{a.label}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ══ Recent Activity ══ */}
            {data.recentActivity?.length > 0 && (
                <section className="cds-section">
                    <h2 className="cds-section-title"><Activity size={18} /> Recent Activity</h2>
                    <div className="cds-activity-list">
                        {data.recentActivity.map((a, i) => (
                            <div key={i} className="cds-activity-item">
                                <div className="cds-activity-dot" />
                                <div className="cds-activity-body">
                                    <p className="cds-activity-text">{a.description}</p>
                                    <span className="cds-activity-time">{new Date(a.time).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ══ Notifications ══ */}
            {data.notifications?.length > 0 && (
                <section className="cds-section">
                    <h2 className="cds-section-title"><Bell size={18} /> Notifications</h2>
                    <div className="cds-activity-list">
                        {data.notifications.map(n => (
                            <div key={n.id} className={`cds-activity-item ${n.read ? 'cds-notif-read' : ''}`}>
                                <div className={`cds-activity-dot ${n.read ? 'cds-dot-dim' : ''}`} />
                                <div className="cds-activity-body">
                                    <p className="cds-activity-text"><strong>{n.title}</strong> — {n.message}</p>
                                    <span className="cds-activity-time">{new Date(n.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
