import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { X, Save, Loader2, CheckCircle2, Upload } from 'lucide-react'

const fitnessLevels = ['beginner', 'intermediate', 'advanced']
const primaryGoals = ['fat-loss', 'muscle', 'endurance', 'wellness']

function getUserIdFromToken() {
    const token = localStorage.getItem('token')
    if (!token) return null
    try {
        return JSON.parse(atob(token.split('.')[1])).sub
    } catch {
        return null
    }
}

const o = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    modal: {
        background: '#13131a', border: '1px solid #2a2a35',
        borderRadius: 16, width: 520, maxWidth: '90vw',
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
    },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 0' },
    headerTitle: { margin: 0, fontSize: 20, color: '#fff' },
    closeBtn: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 6, borderRadius: 8, transition: 'all 0.2s' },
    form: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    field: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888' },
    input: {
        background: '#1a1a24', border: '1px solid #2a2a35',
        borderRadius: 10, padding: '10px 14px', color: '#fff',
        fontSize: 14, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s'
    },
    select: {
        background: '#1a1a24', border: '1px solid #2a2a35',
        borderRadius: 10, padding: '10px 14px', color: '#fff',
        fontSize: 14, outline: 'none', fontFamily: 'inherit', cursor: 'pointer'
    },
    divider: { height: 1, background: '#2a2a35', margin: '4px 0' },
    actions: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 },
    loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '80px 24px', color: '#888' },
    spinner: { width: 24, height: 24, border: '3px solid #2a2a35', borderTopColor: '#FFD600', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
    avatarSection: { display: 'flex', justifyContent: 'center', marginBottom: 4 },
    avatarWrap: { position: 'relative', width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer' },
    avatar: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', border: '3px solid #2a2a35' },
}

export default function ProfileEditModal({ profileForm, setProfileForm, profileFormLoading, setProfileFormLoading, profileFormSaving, setProfileFormSaving, onClose, onSaved }) {
    const { showToast } = useToast()
    const [savingToast, setSavingToast] = useState(null)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (!profileFormLoading && !profileForm.firstName) {
            setProfileFormLoading(true)
            apiFetch('/auth/me')
                .then(data => {
                    setProfileForm({
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
                .finally(() => setProfileFormLoading(false))
        }
    }, [profileForm.firstName, profileFormLoading, setProfileFormLoading, showToast])

    const handleChange = (field) => (e) => {
        setProfileForm(f => ({ ...f, [field]: e.target.value }))
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
                setProfileForm(f => ({ ...f, photo: res.photo }))
            }
            showToast('Foto subida correctamente')
        } catch {
            showToast('Error al subir la foto')
        } finally {
            setUploadingPhoto(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const userId = getUserIdFromToken()
        if (!userId) {
            showToast('Session expired')
            return
        }
        setProfileFormSaving(true)
        setSavingToast('Saving...')
        try {
            await apiFetch(`/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(profileForm),
            })
            setSavingToast('Profile updated successfully!')
            setTimeout(() => {
                setSavingToast(null)
                onSaved?.()
                onClose()
            }, 1200)
        } catch {
            setSavingToast(null)
            showToast('Error saving profile')
        } finally {
            setProfileFormSaving(false)
        }
    }

    return (
        <>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={o.overlay} onClick={onClose}>
            <div style={o.modal} onClick={e => e.stopPropagation()}>
                <div style={o.header}>
                    <h2 style={o.headerTitle}>Edit Profile</h2>
                    <button style={o.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>

                {profileFormLoading ? (
                    <div style={o.loading}>
                        <div style={o.spinner} />
                        <span>Loading profile...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={o.form}>
                        {savingToast && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '12px 16px', borderRadius: 12,
                                background: savingToast.includes('successfully')
                                    ? 'rgba(34,197,94,0.12)' : 'rgba(255,214,0,0.12)',
                                border: `1px solid ${savingToast.includes('successfully') ? 'rgba(34,197,94,0.3)' : 'rgba(255,214,0,0.3)'}`,
                                color: savingToast.includes('successfully') ? '#22c55e' : '#FFD600',
                                fontSize: 14, fontWeight: 500
                            }}>
                                {savingToast.includes('successfully')
                                    ? <CheckCircle2 size={18} />
                                    : <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                                }
                                {savingToast}
                            </div>
                        )}

                        <div style={o.avatarSection}>
                            <div style={o.avatarWrap}>
                                <img loading="lazy"
                                    src={profileForm.photo && (profileForm.photo.startsWith('http://') || profileForm.photo.startsWith('https://'))
                                        ? profileForm.photo : 'https://picsum.photos/seed/default/120/120.jpg'}
                                    alt="" style={o.avatar}
                                />
                            </div>
                        </div>

                        <div style={o.row}>
                            <div style={o.field}>
                                <label style={o.label}>First Name</label>
                                <input style={o.input} value={profileForm.firstName} onChange={handleChange('firstName')} placeholder="First name" />
                            </div>
                            <div style={o.field}>
                                <label style={o.label}>Last Name</label>
                                <input style={o.input} value={profileForm.lastName} onChange={handleChange('lastName')} placeholder="Last name" />
                            </div>
                        </div>

                        <div style={o.field}>
                            <label style={o.label}>Email</label>
                            <input style={o.input} type="email" value={profileForm.email} onChange={handleChange('email')} placeholder="Email address" />
                        </div>

                        <div style={o.field}>
                            <label style={o.label}>Photo URL</label>
                            <input style={o.input} value={profileForm.photo} onChange={handleChange('photo')} placeholder="https://example.com/photo.jpg" />
                        </div>

                        <div style={o.field}>
                            <label style={o.label}>Or upload a file</label>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <button type="button" onClick={() => fileInputRef.current?.click()} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '10px 18px', borderRadius: 10,
                                    background: '#1a1a24', border: '1px dashed #3a3a45',
                                    color: '#aaa', fontSize: 13, fontWeight: 500,
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    transition: 'all 0.2s'
                                }} disabled={uploadingPhoto}>
                                    {uploadingPhoto ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Upload size={16} />}
                                    {uploadingPhoto ? 'Uploading...' : 'Choose Image'}
                                </button>
                                <span style={{ fontSize: 12, color: '#666' }}>JPG, JPEG or PNG max 5MB</span>
                            </div>
                            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </div>

                        <div style={o.divider} />

                        <div style={o.row}>
                            <div style={o.field}>
                                <label style={o.label}>Fitness Level</label>
                                <select style={o.select} value={profileForm.fitnessLevel} onChange={handleChange('fitnessLevel')}>
                                    <option value="">Select level</option>
                                    {fitnessLevels.map(l => (
                                        <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={o.field}>
                                <label style={o.label}>Primary Goal</label>
                                <select style={o.select} value={profileForm.primaryGoal} onChange={handleChange('primaryGoal')}>
                                    <option value="">Select goal</option>
                                    {primaryGoals.map(g => (
                                        <option key={g} value={g}>{g.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={o.field}>
                            <label style={o.label}>Training Days / Week</label>
                            <input style={o.input} type="number" min="1" max="7" value={profileForm.trainingDays} onChange={handleChange('trainingDays')} placeholder="e.g. 4" />
                        </div>

                        <div style={o.actions}>
                            <button type="button" style={{
                                ...o.btn, background: '#2a2a35', color: '#888',
                                padding: '10px 20px', borderRadius: 10, fontSize: 14,
                                fontWeight: 600, cursor: 'pointer', border: 'none',
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                fontFamily: 'inherit', transition: 'all 0.2s'
                            }} onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" style={{
                                ...o.btn, background: '#FFD600', color: '#000',
                                padding: '10px 20px', borderRadius: 10, fontSize: 14,
                                fontWeight: 600, cursor: profileFormSaving ? 'not-allowed' : 'pointer',
                                border: 'none', display: 'inline-flex', alignItems: 'center',
                                gap: 8, fontFamily: 'inherit', opacity: profileFormSaving ? 0.6 : 1,
                                transition: 'all 0.2s'
                            }} disabled={profileFormSaving}>
                                <Save size={16} /> {profileFormSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
        </>
    )
}