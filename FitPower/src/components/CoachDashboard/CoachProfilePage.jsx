import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import {
    User, Mail, Star, MapPin, Phone, Globe,
    Camera, Save, Loader2, CheckCircle2, Upload,
    Award, BookOpen, GraduationCap, Quote,
} from 'lucide-react'
import './CoachDashboard.css'

const StarDisplay = ({ rating }) => (
    <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} size={14} fill={i <= Math.round(rating || 0) ? '#FFD600' : 'none'}
                color={i <= Math.round(rating || 0) ? '#FFD600' : '#525252'} />
        ))}
    </div>
)

export default function CoachProfilePage() {
    const { showToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [profile, setProfile] = useState(null)
    const [trainer, setTrainer] = useState(null)
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '', photo: '',
        phone: '', bio: '', philosophy: '', experience: '',
        country: '', city: '', timezone: '',
        instagram: '', youtube: '', website: '', modality: '',
        emergencyName: '', emergencyPhone: '', emergencyRelation: '',
    })
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [savingToast, setSavingToast] = useState(null)

    const getUserIdFromToken = () => {
        const token = localStorage.getItem('token')
        if (!token) return null
        try {
            return JSON.parse(atob(token.split('.')[1])).sub
        } catch {
            return null
        }
    }

    useEffect(() => {
        apiFetch('/auth/me').then(u => {
            setProfile(u)
            setForm(f => ({
                ...f,
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                email: u.email || '',
                photo: u.photo || '',
            }))
            return apiFetch('/trainers').then(res => {
                const list = res?.trainers || []
                const match = list.find(t => t.email === u.email) || null
                if (!match) return null
                return apiFetch(`/trainers/${match.id}`)
            }).then(t => {
                if (!t) return
                setTrainer(t)
                setForm(f => ({
                    ...f,
                    phone: t.phone || '',
                    bio: t.bio || '',
                    philosophy: t.philosophy || '',
                    experience: t.experience || '',
                    country: t.location?.country || '',
                    city: t.location?.city || '',
                    timezone: t.location?.timezone || '',
                    modality: t.modality || '',
                    instagram: t.social?.instagram || '',
                    youtube: t.social?.youtube || '',
                    website: t.social?.website || '',
                    emergencyName: t.emergencyContact?.name || '',
                    emergencyPhone: t.emergencyContact?.phone || '',
                    emergencyRelation: t.emergencyContact?.relation || '',
                }))
            })
        }).catch(() => showToast('Error loading profile'))
        .finally(() => setLoading(false))
    }, [showToast])

    const handleChange = (field) => (e) => {
        setForm(f => ({ ...f, [field]: e.target.value }))
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const allowed = ['image/jpeg', 'image/png', 'image/jpg']
        if (!allowed.includes(file.type)) {
            showToast('Solo se permiten archivos JPG, JPEG o PNG')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('La imagen no debe superar los 5MB')
            return
        }
        setUploadingPhoto(true)
        try {
            const formData = new FormData()
            formData.append('photo', file)
            const res = await apiFetch('/upload/profile-photo', {
                method: 'POST',
                body: formData,
            })
            if (res?.photo) {
                setForm(f => ({ ...f, photo: res.photo }))
            }
            showToast('Foto subida correctamente')
        } catch {
            showToast('Error al subir la foto')
        } finally {
            setUploadingPhoto(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const userId = getUserIdFromToken()
        if (!userId) {
            showToast('Session expired')
            return
        }
        setSaving(true)
        setSavingToast('Saving...')
        try {
            await apiFetch(`/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    firstName: form.firstName,
                    lastName: form.lastName,
                    photo: form.photo,
                }),
            })
            if (trainer?.id) {
                const payload = {
                    firstName: form.firstName,
                    lastName: form.lastName,
                    phone: form.phone,
                    bio: form.bio,
                    philosophy: form.philosophy,
                    experience: form.experience,
                    country: form.country,
                    city: form.city,
                    timezone: form.timezone,
                    modality: form.modality,
                    instagram: form.instagram,
                    youtube: form.youtube,
                    website: form.website,
                }
                const clean = {}
                for (const [k, v] of Object.entries(payload)) {
                    if (v !== undefined && v !== null) clean[k] = v
                }
                await apiFetch(`/trainers/${trainer.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(clean),
                })
            }
            setSavingToast('Profile updated successfully!')
            setTimeout(() => {
                setSavingToast(null)
                setEditing(false)
            }, 1200)
        } catch {
            setSavingToast(null)
            showToast('Error saving profile')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="cd-main-content" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                    <div className="cd-spinner" />
                </div>
            </div>
        )
    }

    const s = {
        page: { maxWidth: 760, margin: '0 auto', padding: '24px 0' },
        header: { marginBottom: 28 },
        h1: { fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, margin: 0 },
        card: { background: '#13131a', border: '1px solid #2a2a35', borderRadius: 16, padding: 24, marginBottom: 20 },
        cardTitle: { fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 },
        avatarWrap: { width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', position: 'relative', cursor: 'pointer', flexShrink: 0 },
        avatar: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', border: '3px solid rgba(255,214,0,0.25)' },
        avatarPlaceholder: { width: 100, height: 100, borderRadius: '50%', background: 'var(--power-500)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700, border: '3px solid rgba(255,214,0,0.3)' },
        row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
        field: { display: 'flex', flexDirection: 'column', gap: 6 },
        label: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888' },
        input: { background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' },
        textarea: { background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 90, lineHeight: 1.5 },
        select: { background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' },
        statBox: { textAlign: 'center', padding: '14px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' },
        statValue: { fontSize: 22, fontWeight: 700, color: 'var(--power-500)' },
        statLabel: { fontSize: 11, color: '#737373', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.3px' },
    }

    return (
        <div className="cd-main-content" style={{ padding: 24 }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <div style={s.page}>
                <div style={s.header}>
                    <h1 style={s.h1}><User size={24} style={{ color: 'var(--power-500)' }} /> My Coach Profile</h1>
                </div>

                {savingToast && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 16px', borderRadius: 12, marginBottom: 16,
                        background: savingToast.includes('successfully') ? 'rgba(34,197,94,0.12)' : 'rgba(255,214,0,0.12)',
                        border: `1px solid ${savingToast.includes('successfully') ? 'rgba(34,197,94,0.3)' : 'rgba(255,214,0,0.3)'}`,
                        color: savingToast.includes('successfully') ? '#22c55e' : '#FFD600',
                        fontSize: 14, fontWeight: 500,
                    }}>
                        {savingToast.includes('successfully')
                            ? <CheckCircle2 size={18} />
                            : <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                        }
                        {savingToast}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* ═══ HEADER CARD ═══ */}
                    <div style={s.card}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: editing ? 24 : 0 }}>
                            <div style={s.avatarWrap} onClick={() => editing && document.getElementById('profile-photo-input')?.click()}>
                                {form.photo ? (
                                    <img loading="lazy" src={form.photo} alt="" style={s.avatar} />
                                ) : (
                                    <div style={s.avatarPlaceholder}>{(profile?.firstName || '?')[0]}</div>
                                )}
                                {editing && (
                                    <div style={{
                                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: '50%',
                                    }}>
                                        <Camera size={22} color="#fff" />
                                    </div>
                                )}
                            </div>
                            <input id="profile-photo-input" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                                onChange={handleFileUpload} style={{ display: 'none' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
                                    {form.firstName} {form.lastName}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                                    <span style={{ color: '#aaa', fontSize: 14, textTransform: 'capitalize' }}>
                                        {profile?.role || 'Coach'}
                                    </span>
                                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#525252' }} />
                                    <StarDisplay rating={trainer?.avgRating || 0} />
                                    <span style={{ color: '#888', fontSize: 13 }}>
                                        {trainer?.avgRating ? `${trainer.avgRating.toFixed(1)}` : '—'}
                                    </span>
                                    {trainer?.status && (
                                        <>
                                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#525252' }} />
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                padding: '2px 10px', borderRadius: 20,
                                                fontSize: 11, fontWeight: 600,
                                                background: trainer.status === 'approved' ? 'rgba(34,197,94,0.12)' : 'rgba(255,214,0,0.12)',
                                                color: trainer.status === 'approved' ? '#22c55e' : '#FFD600',
                                                textTransform: 'capitalize',
                                            }}>
                                                <span style={{
                                                    width: 6, height: 6, borderRadius: '50%',
                                                    background: trainer.status === 'approved' ? '#22c55e' : '#FFD600',
                                                }} />
                                                {trainer.status}
                                            </span>
                                        </>
                                    )}
                                </div>
                                {!editing && (
                                    <div style={{ marginTop: 14 }}>
                                        <button type="button" className="cd-btn cd-btn-primary cd-btn-sm"
                                            onClick={() => setEditing(true)}>
                                            <Save size={14} /> Edit Profile
                                        </button>
                                    </div>
                                )}
                            </div>
                            {uploadingPhoto && <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite', color: '#FFD600' }} />}
                        </div>

                        {!editing && (
                            <div className="cd-grid-4" style={{ marginTop: 24 }}>
                                <div style={s.statBox}>
                                    <div style={s.statValue}>{trainer?.experience || '—'}</div>
                                    <div style={s.statLabel}>Years Exp.</div>
                                </div>
                                <div style={s.statBox}>
                                    <div style={s.statValue}>{trainer?.programs?.length || 0}</div>
                                    <div style={s.statLabel}>Programs</div>
                                </div>
                                <div style={s.statBox}>
                                    <div style={s.statValue}>{trainer?.reviews?.length || 0}</div>
                                    <div style={s.statLabel}>Reviews</div>
                                </div>
                                <div style={s.statBox}>
                                    <div style={s.statValue}>
                                        {profile?.memberSince ? new Date(profile.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                                    </div>
                                    <div style={s.statLabel}>Since</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ EDIT SECTIONS ═══ */}
                    {editing && (
                        <>
                            {/* Personal Info */}
                            <div style={s.card}>
                                <div style={s.cardTitle}><User size={14} /> Personal Info</div>
                                <div style={s.row}>
                                    <div style={s.field}>
                                        <label style={s.label}>First Name</label>
                                        <input style={s.input} value={form.firstName} onChange={handleChange('firstName')} />
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Last Name</label>
                                        <input style={s.input} value={form.lastName} onChange={handleChange('lastName')} />
                                    </div>
                                </div>
                                <div style={{ ...s.field, marginTop: 16 }}>
                                    <label style={s.label}><Mail size={12} style={{ marginRight: 4 }} /> Email</label>
                                    <input style={s.input} type="email" value={form.email} disabled />
                                </div>
                                <div style={{ ...s.field, marginTop: 16 }}>
                                    <label style={s.label}><Phone size={12} style={{ marginRight: 4 }} /> Phone</label>
                                    <input style={s.input} value={form.phone} onChange={handleChange('phone')} placeholder="+1 234 567 890" />
                                </div>
                                <div style={{ ...s.field, marginTop: 16 }}>
                                    <label style={s.label}><Camera size={12} style={{ marginRight: 4 }} /> Photo URL</label>
                                    <input style={s.input} value={form.photo} onChange={handleChange('photo')} placeholder="https://example.com/photo.jpg" />
                                </div>
                                <div style={{ ...s.field, marginTop: 12 }}>
                                    <label style={s.label}><Upload size={12} style={{ marginRight: 4 }} /> Upload Photo</label>
                                    <button type="button" onClick={() => document.getElementById('profile-photo-input')?.click()} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        padding: '10px 18px', borderRadius: 10,
                                        background: '#1a1a24', border: '1px dashed #3a3a45',
                                        color: '#aaa', fontSize: 13, fontWeight: 500,
                                        cursor: 'pointer', fontFamily: 'inherit', width: 'fit-content',
                                    }}>
                                        <Upload size={16} /> Choose Image
                                    </button>
                                    <span style={{ fontSize: 11, color: '#666', marginTop: 4 }}>JPG, PNG · Max 5MB</span>
                                </div>
                            </div>

                            {/* About You */}
                            <div style={s.card}>
                                <div style={s.cardTitle}><Quote size={14} /> About You</div>
                                <div style={s.field}>
                                    <label style={s.label}>Bio</label>
                                    <textarea style={s.textarea} value={form.bio} onChange={handleChange('bio')}
                                        placeholder="Tell potential clients about yourself, your approach, and what makes you unique..." />
                                </div>
                                <div style={{ ...s.field, marginTop: 16 }}>
                                    <label style={s.label}>Training Philosophy</label>
                                    <textarea style={s.textarea} value={form.philosophy} onChange={handleChange('philosophy')}
                                        placeholder="What's your coaching philosophy? How do you help clients achieve results?" />
                                </div>
                            </div>

                            {/* Professional Details */}
                            <div style={s.card}>
                                <div style={s.cardTitle}><Award size={14} /> Professional Details</div>
                                <div style={s.row}>
                                    <div style={s.field}>
                                        <label style={s.label}>Experience (years)</label>
                                        <input style={s.input} value={form.experience} onChange={handleChange('experience')} placeholder="e.g. 8" />
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Modality</label>
                                        <select style={s.select} value={form.modality} onChange={handleChange('modality')}>
                                            <option value="">Select modality</option>
                                            <option value="online">Online</option>
                                            <option value="in-person">In Person</option>
                                            <option value="hybrid">Hybrid</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={s.row}>
                                    <div style={{ ...s.field, marginTop: 16 }}>
                                        <label style={s.label}><MapPin size={12} style={{ marginRight: 4 }} /> Country</label>
                                        <input style={s.input} value={form.country} onChange={handleChange('country')} placeholder="United States" />
                                    </div>
                                    <div style={{ ...s.field, marginTop: 16 }}>
                                        <label style={s.label}><MapPin size={12} style={{ marginRight: 4 }} /> City</label>
                                        <input style={s.input} value={form.city} onChange={handleChange('city')} placeholder="Miami" />
                                    </div>
                                </div>
                                <div style={{ ...s.field, marginTop: 16 }}>
                                    <label style={s.label}>Timezone</label>
                                    <input style={s.input} value={form.timezone} onChange={handleChange('timezone')} placeholder="America/New_York" />
                                </div>
                            </div>

                            {/* Social Links */}
                            <div style={s.card}>
                                <div style={s.cardTitle}><Globe size={14} /> Social Links</div>
                                <div style={s.row}>
                                    <div style={s.field}>
                                        <label style={s.label}>Instagram</label>
                                        <input style={s.input} value={form.instagram} onChange={handleChange('instagram')} placeholder="@username" />
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>YouTube</label>
                                        <input style={s.input} value={form.youtube} onChange={handleChange('youtube')} placeholder="Channel URL" />
                                    </div>
                                </div>
                                <div style={{ ...s.field, marginTop: 16 }}>
                                    <label style={s.label}>Website</label>
                                    <input style={s.input} value={form.website} onChange={handleChange('website')} placeholder="https://..." />
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            <div style={s.card}>
                                <div style={s.cardTitle}><Phone size={14} /> Emergency Contact</div>
                                <div style={s.row}>
                                    <div style={s.field}>
                                        <label style={s.label}>Full Name</label>
                                        <input style={s.input} value={form.emergencyName} onChange={handleChange('emergencyName')} />
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Phone</label>
                                        <input style={s.input} value={form.emergencyPhone} onChange={handleChange('emergencyPhone')} />
                                    </div>
                                </div>
                                <div style={{ ...s.field, marginTop: 16 }}>
                                    <label style={s.label}>Relation</label>
                                    <input style={s.input} value={form.emergencyRelation} onChange={handleChange('emergencyRelation')} placeholder="Spouse, Parent, Sibling..." />
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button type="button" className="cd-btn cd-btn-secondary cd-btn-sm"
                                    onClick={() => setEditing(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="cd-btn cd-btn-primary cd-btn-sm" disabled={saving}>
                                    <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </>
                    )}
                </form>

                {/* ═══ VIEW MODE SECTIONS ═══ */}
                {!editing && trainer && (
                    <>
                        {/* About Me */}
                        {(trainer.bio || trainer.philosophy) && (
                            <div style={s.card}>
                                <div style={s.cardTitle}><Quote size={14} /> About Me</div>
                                {trainer.bio && (
                                    <div style={{ marginBottom: trainer.philosophy ? 20 : 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#737373', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bio</div>
                                        <p style={{ color: '#d4d4d4', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{trainer.bio}</p>
                                    </div>
                                )}
                                {trainer.philosophy && (
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#737373', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Training Philosophy</div>
                                        <p style={{ color: '#d4d4d4', fontSize: 14, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>"{trainer.philosophy}"</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Professional Details */}
                        <div style={s.card}>
                            <div style={s.cardTitle}><Award size={14} /> Professional Details</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {trainer.experience && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,214,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Award size={16} style={{ color: 'var(--power-500)' }} />
                                            </div>
                                            <div><div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{trainer.experience} years</div><div style={{ color: '#737373', fontSize: 12 }}>Experience</div></div>
                                        </div>
                                    )}
                                    {trainer.modality && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Globe size={16} style={{ color: '#38bdf8' }} />
                                            </div>
                                            <div><div style={{ color: '#fff', fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{trainer.modality}</div><div style={{ color: '#737373', fontSize: 12 }}>Modality</div></div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {(trainer.location?.city || trainer.location?.country) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <MapPin size={16} style={{ color: '#fbbf24' }} />
                                            </div>
                                            <div>
                                                <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                                                    {[trainer.location?.city, trainer.location?.country].filter(Boolean).join(', ')}
                                                </div>
                                                <div style={{ color: '#737373', fontSize: 12 }}>Location</div>
                                            </div>
                                        </div>
                                    )}
                                    {trainer.languages?.length > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <BookOpen size={16} style={{ color: '#34d399' }} />
                                            </div>
                                            <div><div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{trainer.languages.map(l => l.name).join(', ')}</div><div style={{ color: '#737373', fontSize: 12 }}>Languages</div></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Specializations & Certifications */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                            {trainer.specializations?.length > 0 && (
                                <div style={s.card}>
                                    <div style={s.cardTitle}><GraduationCap size={14} /> Specializations</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {trainer.specializations.map(s => (
                                            <span key={s.id || s.name} style={{
                                                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                background: 'rgba(255,214,0,0.1)', color: 'var(--power-500)',
                                            }}>
                                                {s.name || s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {trainer.certifications?.length > 0 && (
                                <div style={s.card}>
                                    <div style={s.cardTitle}><Award size={14} /> Certifications</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {trainer.certifications.map((c, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,214,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Award size={14} style={{ color: 'var(--power-500)' }} />
                                                </div>
                                                <div>
                                                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{c.certification}</div>
                                                    {c.cert_id_number && <div style={{ color: '#737373', fontSize: 12 }}>ID: {c.cert_id_number}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Social Links */}
                        {(trainer.social?.instagram || trainer.social?.youtube || trainer.social?.website) && (
                            <div style={s.card}>
                                <div style={s.cardTitle}><Globe size={14} /> Social & Web</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {trainer.social?.website && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Globe size={14} style={{ color: '#888' }} />
                                            <a href={trainer.social.website} target="_blank" rel="noopener noreferrer"
                                                style={{ color: 'var(--power-500)', fontSize: 14, textDecoration: 'none' }}>
                                                {trainer.social.website.replace(/^https?:\/\//, '')}
                                            </a>
                                        </div>
                                    )}
                                    {trainer.social?.instagram && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Globe size={14} style={{ color: '#888' }} />
                                            <a href={`https://instagram.com/${trainer.social.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                                                style={{ color: 'var(--power-500)', fontSize: 14, textDecoration: 'none' }}>
                                                {trainer.social.instagram.startsWith('@') ? trainer.social.instagram : `@${trainer.social.instagram}`}
                                            </a>
                                        </div>
                                    )}
                                    {trainer.social?.youtube && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Globe size={14} style={{ color: '#888' }} />
                                            <a href={trainer.social.youtube} target="_blank" rel="noopener noreferrer"
                                                style={{ color: 'var(--power-500)', fontSize: 14, textDecoration: 'none' }}>
                                                YouTube Channel
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
