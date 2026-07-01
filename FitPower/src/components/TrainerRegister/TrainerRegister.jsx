import { useState, useRef } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import {
    Zap, ArrowLeft, Check,
    User, Mail, Phone, Calendar, UserCircle,
    Award, Hash, Upload, FileCheck,
    Dumbbell, Flame, Wind, Swords, Bike, Apple,
    HeartPulse, Target, Accessibility, Baby,
    Camera, Pencil, MapPin, Building2,
    MonitorSmartphone, Heart, Globe,
    DollarSign, Users, ShieldCheck, Video,
    Link as LinkIcon, Clock as ClockIcon
} from 'lucide-react'
import './TrainerRegister.css'

export default function TrainerRegister() {
    const { showToast } = useToast()

    // Steps
    const [currentStep, setCurrentStep] = useState(1)
    const [showSuccess, setShowSuccess] = useState(false)

    // Step 1: Personal Info
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [dob, setDob] = useState('')
    const [gender, setGender] = useState('')
    const [photoPreview, setPhotoPreview] = useState('')
    const [touched1, setTouched1] = useState({ firstName: false, lastName: false, email: false, phone: false, dob: false, gender: false })

    // Step 2: Credentials
    const [certType, setCertType] = useState('')
    const [certId, setCertId] = useState('')
    const [certFileName, setCertFileName] = useState('')
    const [experience, setExperience] = useState('')
    const [specs, setSpecs] = useState([])
    const [langs, setLangs] = useState([])
    const [touched2, setTouched2] = useState({ certType: false, certId: false })

    // Step 3: Professional Profile
    const [bio, setBio] = useState('')
    const [philosophy, setPhilosophy] = useState('')
    const [instagram, setInstagram] = useState('')
    const [youtube, setYoutube] = useState('')
    const [website, setWebsite] = useState('')
    const [country, setCountry] = useState('')
    const [city, setCity] = useState('')
    const [timezone, setTimezone] = useState('')
    const [modality, setModality] = useState('')
    const [emergName, setEmergName] = useState('')
    const [emergPhone, setEmergPhone] = useState('')
    const [emergRelation, setEmergRelation] = useState('')

    // Step 4: Agreements
    const [agreeTerms, setAgreeTerms] = useState(false)
    const [agreePrivacy, setAgreePrivacy] = useState(false)
    const [agreeMarketing, setAgreeMarketing] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const photoInputRef = useRef(null)
    const certInputRef = useRef(null)

    const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

    const handlePhotoChange = (e) => {
        const file = e.target.files[0]
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = (ev) => setPhotoPreview(ev.target.result)
            reader.readAsDataURL(file)
        }
    }

    const handleCertUpload = (e) => {
        const file = e.target.files[0]
        if (file) {
            const name = file.name.length > 18 ? file.name.slice(0, 15) + '...' : file.name
            setCertFileName(name)
        }
    }

    const toggleSpec = (spec) => {
        setSpecs((prev) => prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec])
    }

    const toggleLang = (lang) => {
        setLangs((prev) => prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang])
    }

    const goToStep = (step) => {
        setCurrentStep(step)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Step 1 → 2
    const handleToStep2 = () => {
        const t = { firstName: true, lastName: true, email: true, phone: true, dob: true, gender: true }
        setTouched1(t)
        const v1 = firstName.trim().length >= 1
        const v2 = lastName.trim().length >= 1
        const v3 = validateEmail(email)
        const v4 = phone.trim().length >= 6
        const v5 = !!dob
        const v6 = !!gender
        if (v1 && v2 && v3 && v4 && v5 && v6) goToStep(2)
    }

    // Step 2 → 3
    const handleToStep3 = () => {
        setTouched2({ certType: true, certId: true })
        if (!certType || !certId.trim()) return
        if (!experience) { showToast('Please select your years of experience'); return }
        if (specs.length === 0) { showToast('Select at least one specialization'); return }
        if (langs.length === 0) { showToast('Select at least one language'); return }
        goToStep(3)
    }

    // Step 3 → 4
    const handleToStep4 = () => {
        goToStep(4)
    }

    // Submit
    const handleSubmit = async () => {
        if (!agreeTerms || !agreePrivacy) return
        setSubmitting(true)
        try {
            const data = await apiFetch('/trainers', {
                method: 'POST',
                body: JSON.stringify({
                    firstName, lastName, email, phone,
                    dateOfBirth: dob, gender,
                    experience, bio, philosophy,
                    instagram, youtube, website,
                    country, city, timezone, modality,
                    specializations: specs,
                    languages: langs,
                    emergName, emergPhone: emergPhone, emergRelation,
                    agreeTerms, agreePrivacy,
                }),
            })
            if (!data.success) {
                showToast(data.message || 'Error registering as trainer')
                setSubmitting(false)
                return
            }
            if (data.data?.token) {
                localStorage.setItem('token', data.data.token)
                localStorage.setItem('role', 'coach')
            }
            setShowSuccess(true)
        } catch {
            showToast('Server connection error')
        } finally {
            setSubmitting(false)
        }
    }

    const specList = [
        { id: 'strength', icon: Dumbbell, label: 'Strength' },
        { id: 'hiit', icon: Flame, label: 'HIIT' },
        { id: 'yoga', icon: Wind, label: 'Yoga' },
        { id: 'boxing', icon: Swords, label: 'Boxing' },
        { id: 'cycling', icon: Bike, label: 'Cycling' },
        { id: 'nutrition', icon: Apple, label: 'Nutrition' },
        { id: 'rehab', icon: HeartPulse, label: 'Rehab' },
        { id: 'functional', icon: Target, label: 'Functional' },
        { id: 'calisthenics', icon: Accessibility, label: 'Calisthenics' },
        { id: 'prepost-natal', icon: Baby, label: 'Pre/Post-natal' },
        { id: 'crossfit', icon: Zap, label: 'CrossFit' },
    ]

    const langList = [
        'English', 'Español', 'Português', 'Français', 'Deutsch',
        'Italiano', '日本語', '中文', 'العربية', 'हिन्दी',
    ]

    const renderIcon = (Icon) => <Icon size={14} />

    return (
        <div className="tr-page noise grid-pattern">
            <div className="tr-layout">

                {/* ═══ LEFT PANEL ═══ */}
                <div className="tr-left">
                    <img loading="lazy" 
                        src="https://imagenes.elpais.com/resizer/v2/SQGSGL2DRRGYXAWYLAHJKSVHU4.jpg?auth=e1bf637745e3ce301bf7bba7fbbc5e59d04a35305f1381fd973afc6dc6c423bc&width=1200"
                        alt="Trainer"
                        className="tr-left-bg"
                    />
                    <div className="tr-left-content">
                        <a href="/" className="tr-logo">
                            <div className="tr-logo-icon">
                                <Zap size={20} color="#000" />
                            </div>
                            <span className="tr-logo-text">Fit<span className="text-power">Power</span></span>
                        </a>
                    </div>

                    <div className="tr-left-body">
                        <div className="tr-badge">
                            <Award size={14} />
                            <span>Coach Application</span>
                        </div>
                        <h2 className="tr-left-heading">
                            Build your<br /><span className="text-power text-glow">coaching empire</span>
                        </h2>
                        <p className="tr-left-desc">
                            Join our elite network of certified trainers. Reach thousands of clients worldwide, set your own schedule, and earn on your terms.
                        </p>
                        <div className="tr-benefits">
                            <div className="tr-benefit-item">
                                <div className="tr-benefit-icon"><DollarSign size={20} /></div>
                                <div>
                                    <div className="tr-benefit-title">Keep up to 85% of revenue</div>
                                    <div className="tr-benefit-sub">Industry-leading trainer compensation</div>
                                </div>
                            </div>
                            <div className="tr-benefit-item">
                                <div className="tr-benefit-icon"><Users size={20} /></div>
                                <div>
                                    <div className="tr-benefit-title">Access 15K+ active users</div>
                                    <div className="tr-benefit-sub">Built-in client base from day one</div>
                                </div>
                            </div>
                            <div className="tr-benefit-item">
                                <div className="tr-benefit-icon"><ShieldCheck size={20} /></div>
                                <div>
                                    <div className="tr-benefit-title">Verified badge & profile</div>
                                    <div className="tr-benefit-sub">Boost credibility with our stamp of approval</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="tr-left-trust">
                        <span className="tr-trust-text">Trusted by trainers from</span>
                        <span className="tr-trust-brand">Gold's Gym</span>
                        <span className="tr-trust-dot">·</span>
                        <span className="tr-trust-brand">Equinox</span>
                        <span className="tr-trust-dot">·</span>
                        <span className="tr-trust-brand">Barry's</span>
                    </div>

                    <div className="tr-left-decor-circle"></div>
                    <div className="tr-left-decor-glow"></div>
                </div>

                {/* ═══ RIGHT PANEL ═══ */}
                <div className="tr-right">
                    <div className="tr-mobile-header">
                        <a href="/" className="tr-logo tr-logo-sm">
                            <div className="tr-logo-icon tr-logo-icon-sm"><Zap size={16} color="#000" /></div>
                            <span className="tr-logo-text tr-logo-text-sm">Fit<span className="text-power">Power</span></span>
                        </a>
                        <a href="/" className="tr-back-link">← Back</a>
                    </div>

                    <div className="tr-form-wrapper">
                        <div className="tr-form-container">

                            {/* Back to home */}
                            <a href="/" className="tr-back-home">
                                <ArrowLeft size={14} /> Back to home
                            </a>

                            {/* Step Indicator */}
                            {!showSuccess && (
                                <div className="tr-steps">
                                    {[1, 2, 3, 4].map((step) => (
                                        <div key={step} className="tr-step-group">
                                            <div className={`tr-step-dot ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'done' : ''}`}></div>
                                            {step < 4 && <div className={`tr-step-line ${currentStep > step ? 'active' : ''}`}></div>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ═══ FORM ═══ */}
                            {!showSuccess && (
                                <div className="tr-form-screen">

                                    {/* STEP 1: Personal Info */}
                                    {currentStep === 1 && (
                                        <div className="tr-step-content">
                                            <h1 className="tr-title">Personal information</h1>
                                            <p className="tr-subtitle">Tell us who you are. This info will appear on your public coach profile.</p>

                                            {/* Photo Upload */}
                                            <div className="tr-photo-wrapper">
                                                <label className="tr-upload-area tr-upload-photo" id="photoArea">
                                                    <input
                                                        ref={photoInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        className="tr-upload-input"
                                                        onChange={handlePhotoChange}
                                                    />
                                                    {!photoPreview ? (
                                                        <div className="tr-photo-placeholder">
                                                            <Camera size={24} className="tr-upload-icon" />
                                                            <span className="tr-upload-label">Photo</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <img loading="lazy" src={photoPreview} alt="Preview" className="tr-photo-preview" />
                                                            <div className="tr-photo-change">
                                                                <Pencil size={12} />
                                                            </div>
                                                        </>
                                                    )}
                                                </label>
                                            </div>

                                            {/* Name */}
                                            <div className="tr-name-grid">
                                                <div className="tr-field">
                                                    <input
                                                        type="text"
                                                        className={`tr-input ${touched1.firstName ? (firstName.trim().length >= 1 ? 'success' : 'error') : ''}`}
                                                        placeholder="First name"
                                                        value={firstName}
                                                        onChange={(e) => setFirstName(e.target.value)}
                                                        onBlur={() => setTouched1((p) => ({ ...p, firstName: true }))}
                                                        autoComplete="given-name"
                                                    />
                                                    <User size={18} className="tr-input-icon" />
                                                    {touched1.firstName && !firstName.trim() && <div className="tr-field-error visible">Required</div>}
                                                </div>
                                                <div className="tr-field">
                                                    <input
                                                        type="text"
                                                        className={`tr-input ${touched1.lastName ? (lastName.trim().length >= 1 ? 'success' : 'error') : ''}`}
                                                        placeholder="Last name"
                                                        value={lastName}
                                                        onChange={(e) => setLastName(e.target.value)}
                                                        onBlur={() => setTouched1((p) => ({ ...p, lastName: true }))}
                                                        autoComplete="family-name"
                                                    />
                                                    <User size={18} className="tr-input-icon" />
                                                    {touched1.lastName && !lastName.trim() && <div className="tr-field-error visible">Required</div>}
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div className="tr-field">
                                                <input
                                                    type="email"
                                                    className={`tr-input ${touched1.email ? (validateEmail(email) ? 'success' : 'error') : ''}`}
                                                    placeholder="Email address"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    onBlur={() => setTouched1((p) => ({ ...p, email: true }))}
                                                    autoComplete="email"
                                                />
                                                <Mail size={18} className="tr-input-icon" />
                                                {touched1.email && !validateEmail(email) && <div className="tr-field-error visible">Valid email required</div>}
                                            </div>

                                            {/* Phone */}
                                            <div className="tr-field">
                                                <input
                                                    type="tel"
                                                    className={`tr-input ${touched1.phone ? (phone.trim().length >= 6 ? 'success' : 'error') : ''}`}
                                                    placeholder="Phone number"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    onBlur={() => setTouched1((p) => ({ ...p, phone: true }))}
                                                    autoComplete="tel"
                                                />
                                                <Phone size={18} className="tr-input-icon" />
                                                {touched1.phone && phone.trim().length < 6 && <div className="tr-field-error visible">Required</div>}
                                            </div>

                                            {/* DOB + Gender */}
                                            <div className="tr-name-grid">
                                                <div className="tr-field">
                                                    <input
                                                        type="date"
                                                        className={`tr-input tr-input-date ${touched1.dob ? (dob ? 'success' : 'error') : ''}`}
                                                        placeholder="Date of birth"
                                                        value={dob}
                                                        onChange={(e) => setDob(e.target.value)}
                                                        onBlur={() => setTouched1((p) => ({ ...p, dob: true }))}
                                                    />
                                                    <Calendar size={18} className="tr-input-icon" />
                                                    {touched1.dob && !dob && <div className="tr-field-error visible">Required</div>}
                                                </div>
                                                <div className="tr-field">
                                                    <select
                                                        className={`tr-input tr-input-select ${touched1.gender ? (gender ? 'success' : 'error') : ''}`}
                                                        value={gender}
                                                        onChange={(e) => setGender(e.target.value)}
                                                        onBlur={() => setTouched1((p) => ({ ...p, gender: true }))}
                                                    >
                                                        <option value="" disabled>Gender</option>
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                        <option value="nonbinary">Non-binary</option>
                                                        <option value="prefer-not">Prefer not to say</option>
                                                    </select>
                                                    <UserCircle size={18} className="tr-input-icon" />
                                                    {touched1.gender && !gender && <div className="tr-field-error visible">Required</div>}
                                                </div>
                                            </div>

                                            <button type="button" className="tr-btn-primary btn-shine" onClick={handleToStep2}>
                                                Continue
                                            </button>
                                        </div>
                                    )}

                                    {/* STEP 2: Credentials */}
                                    {currentStep === 2 && (
                                        <div className="tr-step-content">
                                            <button type="button" className="tr-back-btn" onClick={() => goToStep(1)}>
                                                <ArrowLeft size={16} /> Back
                                            </button>
                                            <h1 className="tr-title">Credentials & expertise</h1>
                                            <p className="tr-subtitle">We verify all certifications to maintain platform quality standards.</p>

                                            {/* Certification */}
                                            <div className="tr-select-group">
                                                <label className="tr-select-label">Primary certification <span className="tr-required">*</span></label>
                                                <div className="tr-field">
                                                    <select
                                                        className={`tr-input tr-input-select ${touched2.certType ? (certType ? 'success' : 'error') : ''}`}
                                                        value={certType}
                                                        onChange={(e) => setCertType(e.target.value)}
                                                        onBlur={() => setTouched2((p) => ({ ...p, certType: true }))}
                                                    >
                                                        <option value="" disabled>Certification body</option>
                                                        <option value="nasm-cpt">NASM-CPT</option>
                                                        <option value="ace-cpt">ACE-CPT</option>
                                                        <option value="nsca-cscs">NSCA-CSCS</option>
                                                        <option value="issa-cpt">ISSA-CPT</option>
                                                        <option value="acf-l1">ACF-L1</option>
                                                        <option value="crossfit-l2">CrossFit L2</option>
                                                        <option value="precision-nutrition">Precision Nutrition L1</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                    <Award size={18} className="tr-input-icon" />
                                                    {touched2.certType && !certType && <div className="tr-field-error visible">Required</div>}
                                                </div>
                                            </div>

                                            {/* Cert ID + Upload */}
                                            <div className="tr-cert-grid">
                                                <div className="tr-field">
                                                    <input
                                                        type="text"
                                                        className={`tr-input ${touched2.certId ? (certId.trim().length >= 1 ? 'success' : 'error') : ''}`}
                                                        placeholder="Cert. ID number"
                                                        value={certId}
                                                        onChange={(e) => setCertId(e.target.value)}
                                                        onBlur={() => setTouched2((p) => ({ ...p, certId: true }))}
                                                    />
                                                    <Hash size={18} className="tr-input-icon" />
                                                    {touched2.certId && !certId.trim() && <div className="tr-field-error visible">Required</div>}
                                                </div>
                                                <div className="tr-field">
                                                    <label className={`tr-upload-area tr-upload-cert ${certFileName ? 'has-file' : ''}`}>
                                                        <input
                                                            ref={certInputRef}
                                                            type="file"
                                                            accept=".pdf,.jpg,.png"
                                                            className="tr-upload-input"
                                                            onChange={handleCertUpload}
                                                        />
                                                        {!certFileName ? (
                                                            <div className="tr-upload-cert-placeholder">
                                                                <Upload size={16} />
                                                                <span>Upload cert (PDF)</span>
                                                            </div>
                                                        ) : (
                                                            <div className="tr-upload-cert-file">
                                                                <FileCheck size={16} />
                                                                <span>{certFileName}</span>
                                                            </div>
                                                        )}
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Experience */}
                                            <div className="tr-select-group">
                                                <label className="tr-select-label">Years of experience</label>
                                                <div className="tr-exp-grid">
                                                    {['0-1', '1-3', '3-5', '5-10', '10+'].map((exp) => (
                                                        <button
                                                            key={exp}
                                                            type="button"
                                                            className={`tr-tag-btn ${experience === exp ? 'selected' : ''}`}
                                                            onClick={() => setExperience(exp)}
                                                        >
                                                            {exp}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Specializations */}
                                            <div className="tr-select-group">
                                                <label className="tr-select-label">
                                                    Specializations <span className="tr-optional">(select all that apply)</span>
                                                </label>
                                                <div className="tr-tags-grid">
                                                    {specList.map((spec) => {
                                                        const Icon = spec.icon
                                                        return (
                                                            <button
                                                                key={spec.id}
                                                                type="button"
                                                                className={`tr-tag-btn ${specs.includes(spec.id) ? 'selected' : ''}`}
                                                                onClick={() => toggleSpec(spec.id)}
                                                            >
                                                                {renderIcon(Icon)} {spec.label}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Languages */}
                                            <div className="tr-select-group">
                                                <label className="tr-select-label">Languages spoken</label>
                                                <div className="tr-tags-grid">
                                                    {langList.map((lang) => (
                                                        <button
                                                            key={lang}
                                                            type="button"
                                                            className={`tr-tag-btn ${langs.includes(lang) ? 'selected' : ''}`}
                                                            onClick={() => toggleLang(lang)}
                                                        >
                                                            {lang}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <button type="button" className="tr-btn-primary btn-shine" onClick={handleToStep3}>
                                                Continue
                                            </button>
                                        </div>
                                    )}

                                    {/* STEP 3: Professional Profile */}
                                    {currentStep === 3 && (
                                        <div className="tr-step-content">
                                            <button type="button" className="tr-back-btn" onClick={() => goToStep(2)}>
                                                <ArrowLeft size={16} /> Back
                                            </button>
                                            <h1 className="tr-title">Professional profile</h1>
                                            <p className="tr-subtitle">This is what clients will see. Make it count.</p>

                                            {/* Bio */}
                                            <div className="tr-field tr-field-textarea">
                                                <textarea
                                                    className="tr-input tr-textarea"
                                                    rows="3"
                                                    placeholder="Short bio — who are you and what makes you different? (max 200 chars)"
                                                    maxLength={200}
                                                    value={bio}
                                                    onChange={(e) => setBio(e.target.value)}
                                                ></textarea>
                                                <div className="tr-char-count">{bio.length}/200</div>
                                            </div>

                                            {/* Philosophy */}
                                            <div className="tr-field tr-field-textarea">
                                                <textarea
                                                    className="tr-input tr-textarea"
                                                    rows="3"
                                                    placeholder="Training philosophy — what's your approach? (max 300 chars)"
                                                    maxLength={300}
                                                    value={philosophy}
                                                    onChange={(e) => setPhilosophy(e.target.value)}
                                                ></textarea>
                                                <div className="tr-char-count">{philosophy.length}/300</div>
                                            </div>

                                            {/* Social Links */}
                                            <div className="tr-select-group">
                                                <label className="tr-select-label">
                                                    Social links <span className="tr-optional">(optional)</span>
                                                </label>
                                                <div className="tr-field">
                                                    <input type="url" className="tr-input" placeholder="Instagram URL" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                                                    <LinkIcon size={18} className="tr-input-icon" />
                                                </div>
                                                <div className="tr-field">
                                                    <input type="url" className="tr-input" placeholder="YouTube URL" value={youtube} onChange={(e) => setYoutube(e.target.value)} />
                                                    <LinkIcon size={18} className="tr-input-icon" />
                                                </div>
                                                <div className="tr-field">
                                                    <input type="url" className="tr-input" placeholder="Personal website" value={website} onChange={(e) => setWebsite(e.target.value)} />
                                                    <Globe size={18} className="tr-input-icon" />
                                                </div>
                                            </div>

                                            {/* Location & Hours */}
                                            <div className="tr-name-grid">
                                                <div className="tr-field">
                                                    <select className="tr-input tr-input-select" value={country} onChange={(e) => setCountry(e.target.value)}>
                                                        <option value="" disabled>Country</option>
                                                        <option>United States</option>
                                                        <option>United Kingdom</option>
                                                        <option>Canada</option>
                                                        <option>Australia</option>
                                                        <option>Spain</option>
                                                        <option>Mexico</option>
                                                        <option>Brazil</option>
                                                        <option>Germany</option>
                                                        <option>Japan</option>
                                                        <option>India</option>
                                                        <option>Other</option>
                                                    </select>
                                                    <MapPin size={18} className="tr-input-icon" />
                                                </div>
                                                <div className="tr-field">
                                                    <input type="text" className="tr-input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                                                    <Building2 size={18} className="tr-input-icon" />
                                                </div>
                                            </div>
                                            <div className="tr-name-grid">
                                                <div className="tr-field">
                                                    <select className="tr-input tr-input-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                                                        <option value="" disabled>Timezone</option>
                                                        <option>EST (UTC-5)</option>
                                                        <option>CST (UTC-6)</option>
                                                        <option>MST (UTC-7)</option>
                                                        <option>PST (UTC-8)</option>
                                                        <option>GMT (UTC+0)</option>
                                                        <option>CET (UTC+1)</option>
                                                        <option>JST (UTC+9)</option>
                                                        <option>IST (UTC+5:30)</option>
                                                        <option>AEST (UTC+10)</option>
                                                    </select>
                                                    <ClockIcon size={18} className="tr-input-icon" />
                                                </div>
                                                <div className="tr-field">
                                                    <select className="tr-input tr-input-select" value={modality} onChange={(e) => setModality(e.target.value)}>
                                                        <option value="" disabled>Modality</option>
                                                        <option value="online">Online only</option>
                                                        <option value="in-person">In-person only</option>
                                                        <option value="hybrid">Hybrid</option>
                                                    </select>
                                                    <MonitorSmartphone size={18} className="tr-input-icon" />
                                                </div>
                                            </div>

                                            {/* Emergency Contact */}
                                            <div className="tr-section-divider">
                                                <label className="tr-select-label">Emergency contact</label>
                                                <div className="tr-emerg-grid">
                                                    <div className="tr-field">
                                                        <input type="text" className="tr-input" placeholder="Full name" value={emergName} onChange={(e) => setEmergName(e.target.value)} />
                                                        <User size={18} className="tr-input-icon" />
                                                    </div>
                                                    <div className="tr-field">
                                                        <input type="tel" className="tr-input" placeholder="Phone" value={emergPhone} onChange={(e) => setEmergPhone(e.target.value)} />
                                                        <Phone size={18} className="tr-input-icon" />
                                                    </div>
                                                    <div className="tr-field">
                                                        <select className="tr-input tr-input-select" value={emergRelation} onChange={(e) => setEmergRelation(e.target.value)}>
                                                            <option value="" disabled>Relation</option>
                                                            <option>Spouse</option>
                                                            <option>Parent</option>
                                                            <option>Sibling</option>
                                                            <option>Friend</option>
                                                            <option>Other</option>
                                                        </select>
                                                        <Heart size={18} className="tr-input-icon" />
                                                    </div>
                                                </div>
                                            </div>

                                            <button type="button" className="tr-btn-primary btn-shine" onClick={handleToStep4}>
                                                Continue
                                            </button>
                                        </div>
                                    )}

                                    {/* STEP 4: Review */}
                                    {currentStep === 4 && (
                                        <div className="tr-step-content">
                                            <button type="button" className="tr-back-btn" onClick={() => goToStep(3)}>
                                                <ArrowLeft size={16} /> Back
                                            </button>
                                            <h1 className="tr-title">Review & submit</h1>
                                            <p className="tr-subtitle">Please verify all information before submitting your application.</p>

                                            {/* Summary */}
                                            <div className="tr-summary-card">
                                                <div className="tr-summary-row">
                                                    <span className="tr-summary-label">Name</span>
                                                    <span className="tr-summary-value">{firstName} {lastName}</span>
                                                </div>
                                                <div className="tr-summary-divider"></div>
                                                <div className="tr-summary-row">
                                                    <span className="tr-summary-label">Email</span>
                                                    <span className="tr-summary-value">{email}</span>
                                                </div>
                                                <div className="tr-summary-divider"></div>
                                                <div className="tr-summary-row">
                                                    <span className="tr-summary-label">Phone</span>
                                                    <span className="tr-summary-value">{phone}</span>
                                                </div>
                                                <div className="tr-summary-divider"></div>
                                                <div className="tr-summary-row">
                                                    <span className="tr-summary-label">Certification</span>
                                                    <span className="tr-summary-value tr-summary-value-accent">{certType || '—'}</span>
                                                </div>
                                                <div className="tr-summary-divider"></div>
                                                <div className="tr-summary-row">
                                                    <span className="tr-summary-label">Experience</span>
                                                    <span className="tr-summary-value">{experience ? `${experience} years` : '—'}</span>
                                                </div>
                                                <div className="tr-summary-divider"></div>
                                                <div className="tr-summary-row">
                                                    <span className="tr-summary-label">Specializations</span>
                                                    <span className="tr-summary-value tr-summary-value-trunc">{specs.join(', ') || '—'}</span>
                                                </div>
                                                <div className="tr-summary-divider"></div>
                                                <div className="tr-summary-row">
                                                    <span className="tr-summary-label">Languages</span>
                                                    <span className="tr-summary-value">{langs.join(', ') || '—'}</span>
                                                </div>
                                                <div className="tr-summary-divider"></div>
                                                <div className="tr-summary-row">
                                                    <span className="tr-summary-label">Location</span>
                                                    <span className="tr-summary-value">{[city, country].filter(Boolean).join(', ') || '—'}</span>
                                                </div>
                                                <div className="tr-summary-divider"></div>
                                                <div className="tr-summary-row">
                                                    <span className="tr-summary-label">Modality</span>
                                                    <span className="tr-summary-value tr-summary-value-cap">{modality || '—'}</span>
                                                </div>
                                            </div>

                                            {/* Agreements */}
                                            <div className="tr-agreements">
                                                <label className="tr-checkbox">
                                                    <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                                                    <div className="tr-checkbox-box"><Check size={10} strokeWidth={3} /></div>
                                                    <span className="tr-checkbox-text">
                                                        I agree to the <a href="/contact" className="tr-checkbox-link">Trainer Agreement</a> and <a href="/contact" className="tr-checkbox-link">Code of Conduct</a>
                                                    </span>
                                                </label>
                                                <label className="tr-checkbox">
                                                    <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
                                                    <div className="tr-checkbox-box"><Check size={10} strokeWidth={3} /></div>
                                                    <span className="tr-checkbox-text">I consent to a background check and confirm all provided information is accurate</span>
                                                </label>
                                                <label className="tr-checkbox">
                                                    <input type="checkbox" checked={agreeMarketing} onChange={(e) => setAgreeMarketing(e.target.checked)} />
                                                    <div className="tr-checkbox-box"><Check size={10} strokeWidth={3} /></div>
                                                    <span className="tr-checkbox-text">I want to receive updates about trainer opportunities and platform news <span className="tr-optional">(optional)</span></span>
                                                </label>
                                            </div>
                                            {(!agreeTerms || !agreePrivacy) && (
                                                <div className="tr-field-error visible" style={{ paddingLeft: 0, marginBottom: 16 }}>
                                                    You must accept the agreement and consent to continue
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                className="tr-btn-primary btn-shine"
                                                onClick={handleSubmit}
                                                disabled={submitting}
                                            >
                                                {submitting ? (
                                                    <><span className="tr-spinner"></span> Submitting...</>
                                                ) : (
                                                    'Submit Application'
                                                )}
                                            </button>
                                            <p className="tr-review-note">Typical review time: 3–5 business days</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ═══ SUCCESS ═══ */}
                            {showSuccess && (
                                <div className="tr-success-screen">
                                    <div className="tr-success-check">
                                        <Check size={40} className="tr-success-icon" />
                                    </div>
                                    <h1 className="tr-title" style={{ textAlign: 'center' }}>Application received</h1>
                                    <p className="tr-subtitle tr-subtitle-center">
                                        Thank you for applying to FitPower. Our team will review your credentials and get back to you within 3–5 business days.
                                    </p>
                                    <div className="tr-success-cards">
                                        <div className="tr-success-card">
                                            <div className="tr-success-card-icon tr-success-card-icon-blue">
                                                <Mail size={12} />
                                            </div>
                                            <span className="tr-success-card-text">Confirmation email sent to your address</span>
                                        </div>
                                        <div className="tr-success-card">
                                            <div className="tr-success-card-icon tr-success-card-icon-yellow">
                                                <ClockIcon size={12} />
                                            </div>
                                            <span className="tr-success-card-text">Review period: 3–5 business days</span>
                                        </div>
                                        <div className="tr-success-card">
                                            <div className="tr-success-card-icon tr-success-card-icon-green">
                                                <Video size={12} />
                                            </div>
                                            <span className="tr-success-card-text">If approved, you'll be invited to an onboarding call</span>
                                        </div>
                                    </div>
                                    <a href="/coach/dashboard" className="tr-btn-primary btn-shine tr-btn-success">
                                        Ir al Dashboard
                                    </a>
                                </div>
                            )}

                        </div>
                    </div>

                    <div className="tr-footer">
                        <p className="tr-footer-text">© {new Date().getFullYear()} FitPower. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
