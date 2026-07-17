import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { X, Camera, Save } from 'lucide-react'
import './ProfileModal.css'

function getUserIdFromToken() {
    const token = localStorage.getItem('token')
    if (!token) return null
    try {
        return JSON.parse(atob(token.split('.')[1])).sub
    } catch {
        return null
    }
}

const fitnessLevels = ['beginner', 'intermediate', 'advanced']
const primaryGoals = ['fat-loss', 'muscle', 'endurance', 'wellness']

export default function ProfileModal({ isOpen, onClose, onSaved }) {
    const { showToast } = useToast()
    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '', photo: '',
        fitnessLevel: '', primaryGoal: '', trainingDays: '',
    })
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isOpen) return
        setLoading(true)
        apiFetch('/auth/me')
            .then(data => {
                setForm({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    photo: data.photo || '',
                    fitnessLevel: data.fitnessLevel || '',
                    primaryGoal: data.primaryGoal || '',
                    trainingDays: data.trainingDays?.toString() || '',
                })
            })
            .catch(() => showToast('Error loading profile'))
            .finally(() => setLoading(false))
    }, [isOpen, showToast])

    const handleChange = (field) => (e) => {
        setForm(f => ({ ...f, [field]: e.target.value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const userId = getUserIdFromToken()
        if (!userId) {
            showToast('Session expired')
            return
        }
        setSaving(true)
        try {
            await apiFetch(`/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(form),
            })
            showToast('Profile updated')
            onSaved?.()
            onClose()
        } catch {
            showToast('Error saving profile')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="pm-overlay" onClick={onClose}>
            <div className="pm-modal" onClick={e => e.stopPropagation()}>
                <div className="pm-header">
                    <h2>Edit Profile</h2>
                    <button className="pm-close" onClick={onClose}><X size={20} /></button>
                </div>

                {loading ? (
                    <div className="pm-loading">
                        <div className="pm-spinner" />
                        <span>Loading profile...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="pm-form">
                        <div className="pm-avatar-section">
                            <div className="pm-avatar-wrap">
                                <img loading="lazy"
                                    src={form.photo && (form.photo.startsWith('http://') || form.photo.startsWith('https://')) ? form.photo : 'https://picsum.photos/seed/default/120/120.jpg'}
                                    alt=""
                                    className="pm-avatar"
                                />
                                <div className="pm-avatar-overlay">
                                    <Camera size={18} />
                                </div>
                            </div>
                        </div>

                        <div className="pm-row">
                            <div className="pm-field">
                                <label>First Name</label>
                                <input value={form.firstName} onChange={handleChange('firstName')} placeholder="First name" />
                            </div>
                            <div className="pm-field">
                                <label>Last Name</label>
                                <input value={form.lastName} onChange={handleChange('lastName')} placeholder="Last name" />
                            </div>
                        </div>

                        <div className="pm-field">
                            <label>Email</label>
                            <input type="email" value={form.email} onChange={handleChange('email')} placeholder="Email address" />
                        </div>

                        <div className="pm-field">
                            <label>Photo URL</label>
                            <input value={form.photo} onChange={handleChange('photo')} placeholder="https://example.com/photo.jpg" />
                        </div>

                        <div className="pm-divider" />

                        <div className="pm-row">
                            <div className="pm-field">
                                <label>Fitness Level</label>
                                <select value={form.fitnessLevel} onChange={handleChange('fitnessLevel')}>
                                    <option value="">Select level</option>
                                    {fitnessLevels.map(l => (
                                        <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pm-field">
                                <label>Primary Goal</label>
                                <select value={form.primaryGoal} onChange={handleChange('primaryGoal')}>
                                    <option value="">Select goal</option>
                                    {primaryGoals.map(g => (
                                        <option key={g} value={g}>{g.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pm-field">
                            <label>Training Days / Week</label>
                            <input type="number" min="1" max="7" value={form.trainingDays} onChange={handleChange('trainingDays')} placeholder="e.g. 4" />
                        </div>

                        <div className="pm-actions">
                            <button type="button" className="pm-btn pm-btn-cancel" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="pm-btn pm-btn-save" disabled={saving}>
                                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
