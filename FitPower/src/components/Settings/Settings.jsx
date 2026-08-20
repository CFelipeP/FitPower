import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'

import { apiFetch } from '../../lib/api'
import { mediaUrl } from '../../lib/media'
import {
    Bell, Eye, Palette, Ruler, Clock,
    Mail, Smartphone, MessageSquare,
    Save, Loader2,
    BarChart3
} from 'lucide-react'
import './Settings.css'

const TABS = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'units', label: 'Units', icon: Ruler },
]

export default function Settings({ compact = false }) {
    const { showToast } = useToast()
    const [activeTab, setActiveTab] = useState('notifications')
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [userPhoto, setUserPhoto] = useState(null)

    useEffect(() => {
        apiFetch('/settings')
            .then(setSettings)
            .catch(() => showToast('Error loading settings'))
            .finally(() => setLoading(false))
    }, [showToast])

    useEffect(() => {
        apiFetch('/auth/me')
            .then(data => {
                if (data.photo) {
                    setUserPhoto(mediaUrl(data.photo))
                }
            })
            .catch(() => {})
    }, [])

    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await apiFetch('/settings', {
                method: 'PUT',
                body: JSON.stringify(settings),
            })
            setSettings(updated)
            showToast('Settings saved')
        } catch {
            showToast('Error saving settings')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="stg-wrap">
                <div className="stg-loading">
                    <Loader2 className="stg-spinner" />
                    <span>Loading settings...</span>
                </div>
            </div>
        )
    }

    if (!settings) {
        return (
            <div className="stg-wrap">
                <div className="stg-empty">Could not load settings.</div>
            </div>
        )
    }

    return (
        <div className="stg-wrap">
            {!compact && (
                <header className="stg-header">
                    <div className="stg-header-inner">
                        <div className="stg-search-wrap">
                            <input type="text" placeholder="Search..." className="stg-search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="stg-header-right">
                            <div className="stg-avatar-wrap">
                                {userPhoto ? (
                                    <img loading="lazy" src={userPhoto} alt="Profile" className="stg-avatar" />
                                ) : (
                                    <div className="stg-avatar stg-avatar-initials">{(settings?.firstName || 'U')[0].toUpperCase()}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>
            )}

            <div className="stg-content">
                <div className="stg-layout">
                    {!compact && (
                        <aside className="stg-sidebar">
                            <h2 className="stg-title">Settings</h2>
                            <p className="stg-subtitle">Manage your preferences</p>
                            <nav className="stg-tabs">
                                {TABS.map(tab => {
                                    const Icon = tab.icon
                                    return (
                                        <button
                                            key={tab.id}
                                            className={'stg-tab' + (activeTab === tab.id ? ' stg-tab-active' : '')}
                                            onClick={() => setActiveTab(tab.id)}
                                        >
                                            <Icon size={18} />
                                            <span>{tab.label}</span>
                                        </button>
                                    )
                                })}
                            </nav>
                        </aside>
                    )}

                    <main className="stg-main">
                        {compact && (
                            <div className="stg-compact-tabs">
                                {TABS.map(tab => {
                                    const Icon = tab.icon
                                    return (
                                        <button
                                            key={tab.id}
                                            className={'stg-tab' + (activeTab === tab.id ? ' stg-tab-active' : '')}
                                            onClick={() => setActiveTab(tab.id)}
                                        >
                                            <Icon size={16} />
                                            <span>{tab.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                        {activeTab === 'notifications' && (
                            <section className="stg-section">
                                <h3 className="stg-section-title">Notification Preferences</h3>
                                <p className="stg-section-desc">Choose how you receive notifications.</p>
                                <div className="stg-card">
                                    <div className="stg-row">
                                        <div className="stg-row-info">
                                            <Mail size={20} />
                                            <div>
                                                <div className="stg-row-label">Email Notifications</div>
                                                <div className="stg-row-desc">Receive updates via email</div>
                                            </div>
                                        </div>
                                        <label className="stg-toggle">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifications_email}
                                                onChange={() => handleToggle('notifications_email')}
                                            />
                                            <span className="stg-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="stg-row">
                                        <div className="stg-row-info">
                                            <Smartphone size={20} />
                                            <div>
                                                <div className="stg-row-label">Push Notifications</div>
                                                <div className="stg-row-desc">Push notifications on your device</div>
                                            </div>
                                        </div>
                                        <label className="stg-toggle">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifications_push}
                                                onChange={() => handleToggle('notifications_push')}
                                            />
                                            <span className="stg-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="stg-row">
                                        <div className="stg-row-info">
                                            <MessageSquare size={20} />
                                            <div>
                                                <div className="stg-row-label">In-app Notifications</div>
                                                <div className="stg-row-desc">Show notifications inside the app</div>
                                            </div>
                                        </div>
                                        <label className="stg-toggle">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifications_inapp !== false}
                                                onChange={() => handleToggle('notifications_inapp')}
                                            />
                                            <span className="stg-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="stg-row">
                                        <div className="stg-row-info">
                                            <Smartphone size={20} />
                                            <div>
                                                <div className="stg-row-label">SMS Notifications</div>
                                                <div className="stg-row-desc">Receive SMS alerts (not available yet)</div>
                                            </div>
                                        </div>
                                        <label className="stg-toggle">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifications_sms}
                                                onChange={() => handleToggle('notifications_sms')}
                                            />
                                            <span className="stg-toggle-slider" />
                                        </label>
                                    </div>
                                </div>

                                <h4 className="stg-subsection-title">Push categories</h4>
                                <p className="stg-section-desc">Choose which push notifications you receive on this device.</p>
                                <div className="stg-card">
                                    {[
                                        { key: 'notifications_push_workout', label: 'Workouts & streaks', desc: 'Workout reminders, streak alerts, weekly summaries' },
                                        { key: 'notifications_push_coach', label: 'Coach & messages', desc: 'New messages and assigned routines' },
                                        { key: 'notifications_push_payments', label: 'Payments', desc: 'Payment failures, subscription updates' },
                                        { key: 'notifications_push_achievements', label: 'Achievements', desc: 'New achievements and milestones' },
                                        { key: 'notifications_push_system', label: 'System', desc: 'Account and support updates' },
                                    ].map(cat => (
                                        <div className="stg-row" key={cat.key}>
                                            <div className="stg-row-info">
                                                <Bell size={20} />
                                                <div>
                                                    <div className="stg-row-label">{cat.label}</div>
                                                    <div className="stg-row-desc">{cat.desc}</div>
                                                </div>
                                            </div>
                                            <label className="stg-toggle">
                                                <input
                                                    type="checkbox"
                                                    checked={settings[cat.key] !== false}
                                                    onChange={() => handleToggle(cat.key)}
                                                />
                                                <span className="stg-toggle-slider" />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {activeTab === 'appearance' && (
                            <section className="stg-section">
                                <h3 className="stg-section-title">Appearance</h3>
                                <p className="stg-section-desc">Customize your visual experience.</p>
                                <div className="stg-card">
                                    <div className="stg-row">
                                        <div className="stg-row-info">
                                            <Clock size={20} />
                                            <div>
                                                <div className="stg-row-label">Timezone</div>
                                                <div className="stg-row-desc">Your local timezone</div>
                                            </div>
                                        </div>
                                        <div className="stg-select-wrap">
                                            <select
                                                className="stg-select"
                                                value={settings.timezone}
                                                onChange={e => handleChange('timezone', e.target.value)}
                                            >
                                                <option value="America/Mexico_City">America/Mexico City</option>
                                                <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos Aires</option>
                                                <option value="America/Bogota">America/Bogota</option>
                                                <option value="America/Lima">America/Lima</option>
                                                <option value="America/Santiago">America/Santiago</option>
                                                <option value="America/New_York">America/New York</option>
                                                <option value="America/Chicago">America/Chicago</option>
                                                <option value="America/Los_Angeles">America/Los Angeles</option>
                                                <option value="Europe/Madrid">Europe/Madrid</option>
                                                <option value="Europe/London">Europe/London</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'privacy' && (
                            <section className="stg-section">
                                <h3 className="stg-section-title">Privacy</h3>
                                <p className="stg-section-desc">Control your privacy settings.</p>
                                <div className="stg-card">
                                    <div className="stg-row">
                                        <div className="stg-row-info">
                                            <Eye size={20} />
                                            <div>
                                                <div className="stg-row-label">Public Profile</div>
                                                <div className="stg-row-desc">Allow other users to see your profile</div>
                                            </div>
                                        </div>
                                        <label className="stg-toggle">
                                            <input
                                                type="checkbox"
                                                checked={settings.privacy_profile_public}
                                                onChange={() => handleToggle('privacy_profile_public')}
                                            />
                                            <span className="stg-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="stg-row">
                                        <div className="stg-row-info">
                                            <BarChart3 size={20} />
                                            <div>
                                                <div className="stg-row-label">Show Progress</div>
                                                <div className="stg-row-desc">Display your progress to the community</div>
                                            </div>
                                        </div>
                                        <label className="stg-toggle">
                                            <input
                                                type="checkbox"
                                                checked={settings.privacy_show_progress}
                                                onChange={() => handleToggle('privacy_show_progress')}
                                            />
                                            <span className="stg-toggle-slider" />
                                        </label>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'units' && (
                            <section className="stg-section">
                                <h3 className="stg-section-title">Measurement Units</h3>
                                <p className="stg-section-desc">Set your preferred measurement system.</p>
                                <div className="stg-card">
                                    <div className="stg-row">
                                        <div className="stg-row-info">
                                            <Ruler size={20} />
                                            <div>
                                                <div className="stg-row-label">Measurement Unit</div>
                                                <div className="stg-row-desc">Metric or Imperial system</div>
                                            </div>
                                        </div>
                                        <div className="stg-select-wrap">
                                            <select
                                                className="stg-select"
                                                value={settings.measurement_unit}
                                                onChange={e => handleChange('measurement_unit', e.target.value)}
                                            >
                                                <option value="metric">Metric (kg, cm)</option>
                                                <option value="imperial">Imperial (lb, ft)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className="stg-actions">
                            <button
                                className="stg-btn stg-btn-primary"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <><Loader2 className="stg-spinner" size={16} /> Saving...</>
                                ) : (
                                    <><Save size={16} /> Save Changes</>
                                )}
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}



