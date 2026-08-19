import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Star, MapPin, Award, Globe, Camera, CirclePlay, ExternalLink, ArrowLeft, Quote, CalendarDays, Loader2 } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { confirmSwal, swalError, swalSuccess } from '../../lib/alerts'
import './CoachProfile.css'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function CoachProfile() {
    const { id } = useParams()
    const [coach, setCoach] = useState(null)
    const [loading, setLoading] = useState(true)
    const [availability, setAvailability] = useState([])
    const [booking, setBooking] = useState(false)
    const [bookingSlot, setBookingSlot] = useState(null)
    const [bookingError, setBookingError] = useState(null)
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()

    useEffect(() => {
        setLoading(true)
        apiFetch(`/public/trainers/${id}`)
            .then(data => {
                if (data) setCoach(data)
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [id])

    useEffect(() => {
        apiFetch(`/coaches/${id}/availability`)
            .then(d => setAvailability(Array.isArray(d) ? d : []))
            .catch(() => setAvailability([]))
    }, [id])

    const handleBook = async (slot) => {
        if (!isAuthenticated) {
            navigate('/login')
            return
        }
        setBookingSlot(slot)
        setBookingError(null)
        // Next occurrence of the coach's weekly slot.
        const dayIdx = Number(slot.dayOfWeek)
        const today = new Date()
        let daysAhead = (dayIdx - today.getDay() + 7) % 7
        if (daysAhead === 0) daysAhead = 7
        const target = new Date(today)
        target.setDate(today.getDate() + daysAhead)
        const dateStr = target.toISOString().slice(0, 10)

        const formattedDate = target.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        const ok = await confirmSwal(
            `Book a 1-on-1 session with ${coach.firstName} ${coach.lastName} on ${formattedDate} at ${slot.startTime}?`,
            'Confirm booking',
            { confirmText: 'Book Session', cancelText: 'Cancel' }
        )
        if (!ok) {
            setBookingSlot(null)
            return
        }

        setBooking(true)
        try {
            await apiFetch('/sessions', {
                method: 'POST',
                body: JSON.stringify({
                    trainerId: coach.id,
                    title: `Session with ${coach.firstName} ${coach.lastName}`,
                    date: dateStr,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    type: '1on1',
                }),
            })
            swalSuccess(
                `${formattedDate} at ${slot.startTime} with ${coach.firstName}. They will see it in their schedule.`,
                'Session booked!'
            )
        } catch (e) {
            setBookingError(e.message || 'Could not book this session. Please try again.')
            swalError(e.message || 'Could not book this session. Please try again.', 'Booking failed')
        } finally {
            setBooking(false)
            setBookingSlot(null)
        }
    }

    if (loading) {
        return (
            <div className="coach-profile-page">
                <div className="coach-profile-loading">
                    <div className="skeleton-banner" />
                    <div className="container">
                        <div className="skeleton-avatar-large" />
                        <div className="skeleton-line w-40" style={{ margin: '16px auto' }} />
                        <div className="skeleton-line w-60" style={{ margin: '0 auto' }} />
                    </div>
                </div>
            </div>
        )
    }

    if (!coach) {
        return (
            <div className="coach-profile-page">
                <div className="coach-profile-not-found">
                    <h2>Coach not found</h2>
                    <p>This coach may not be available or the link is invalid.</p>
                    <Link to="/coaches" className="btn-primary btn-shine">Browse coaches</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="coach-profile-page">
            <div className="coach-profile-banner" />

            <div className="container coach-profile-content">
                <Link to="/coaches" className="coach-back-link">
                    <ArrowLeft size={16} /> Back to coaches
                </Link>

                <div className="coach-profile-header">
                    <div className="coach-profile-photo">
                        {coach.photo ? (
                            <img src={coach.photo} alt={`${coach.firstName} ${coach.lastName}`} />
                        ) : (
                            <div className="coach-profile-avatar">
                                {coach.firstName[0]}{coach.lastName[0]}
                            </div>
                        )}
                    </div>

                    <div className="coach-profile-info">
                        <h1 className="coach-profile-name">{coach.firstName} {coach.lastName}</h1>

                        <div className="coach-profile-rating">
                            <Star size={16} fill="var(--power-500)" color="var(--power-500)" />
                            <span className="coach-rating-value">{coach.avgRating > 0 ? coach.avgRating.toFixed(1) : 'New'}</span>
                            <span className="coach-rating-count">({coach.reviewCount} {coach.reviewCount === 1 ? 'review' : 'reviews'})</span>
                        </div>

                        <div className="coach-profile-details">
                            {coach.experience && (
                                <div className="coach-detail-item">
                                    <Award size={16} />
                                    <span>{coach.experience} years experience</span>
                                </div>
                            )}
                            {coach.country && (
                                <div className="coach-detail-item">
                                    <MapPin size={16} />
                                    <span>{coach.city ? `${coach.city}, ` : ''}{coach.country}</span>
                                </div>
                            )}
                            {coach.modality && (
                                <div className="coach-detail-item">
                                    <Globe size={16} />
                                    <span className="coach-modality-badge">{coach.modality}</span>
                                </div>
                            )}
                        </div>

                        <div className="coach-profile-specs">
                            {coach.specializations.map(s => (
                                <span key={s.id} className="coach-spec-tag">{s.name}</span>
                            ))}
                        </div>

                        <div className="coach-profile-langs">
                            {coach.languages.map(l => (
                                <span key={l.id} className="coach-lang-tag">{l.name}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="coach-profile-body">
                    <div className="coach-profile-main">
                        {coach.bio && (
                            <section className="coach-section">
                                <h2>About</h2>
                                <p className="coach-bio">{coach.bio}</p>
                            </section>
                        )}

                        {coach.philosophy && (
                            <section className="coach-section">
                                <h2>Training Philosophy</h2>
                                <div className="coach-philosophy">
                                    <Quote size={20} />
                                    <p>{coach.philosophy}</p>
                                </div>
                            </section>
                        )}

                        {coach.certifications?.length > 0 && (
                            <section className="coach-section">
                                <h2>Certifications</h2>
                                <div className="coach-certs">
                                    {coach.certifications.map((c, i) => (
                                        <div key={i} className="coach-cert-item">
                                            <Award size={16} />
                                            <span>{c.certification}</span>
                                            {c.cert_id_number && <span className="cert-id">ID: {c.cert_id_number}</span>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {coach.programs?.length > 0 && (
                            <section className="coach-section">
                                <h2>Programs</h2>
                                <div className="coach-programs-grid">
                                    {coach.programs.map(p => (
                                        <div key={p.id} className="coach-program-card">
                                            <h4>{p.name}</h4>
                                            {p.difficulty && <span className="coach-program-diff">{p.difficulty}</span>}
                                            {p.description && <p>{p.description}</p>}
                                            {p.enrollments > 0 && <span className="coach-program-enrolls">{p.enrollments} enrolled</span>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="coach-profile-sidebar">
                        <section className="coach-section coach-book-section">
                            <h2><CalendarDays size={16} /> Book a session</h2>
                            {availability.length === 0 ? (
                                <p className="coach-book-empty">This coach has not published their availability yet.</p>
                            ) : (
                                <div className="coach-book-slots">
                                    {availability.map((slot, i) => (
                                        <button
                                            key={slot.id || i}
                                            className="coach-book-slot"
                                            onClick={() => handleBook(slot)}
                                            disabled={booking}
                                        >
                                            {booking && bookingSlot === slot ? (
                                                <Loader2 size={14} className="spin" />
                                            ) : (
                                                <CalendarDays size={14} />
                                            )}
                                            <span>{DAY_NAMES[Number(slot.dayOfWeek)]}</span>
                                            <span className="coach-book-time">{slot.startTime} – {slot.endTime}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {bookingError && <p className="coach-book-error">{bookingError}</p>}
                            <p className="coach-book-hint">Booking a session with a coach requires an active plan with live coaching.</p>
                        </section>

                        {coach.reviews?.length > 0 && (
                            <section className="coach-section coach-reviews-section">
                                <h2>Reviews ({coach.reviewCount})</h2>
                                <div className="coach-reviews">
                                    {coach.reviews.map((r, i) => (
                                        <div key={i} className="coach-review-item">
                                            <div className="coach-review-header">
                                                <div className="coach-review-avatar">
                                                    {r.user_photo ? (
                                                        <img src={r.user_photo} alt={r.user_name} />
                                                    ) : (
                                                        <span>{r.user_name?.[0] || 'U'}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="coach-review-name">{r.user_name}</div>
                                                    <div className="coach-review-stars">
                                                        {[...Array(5)].map((_, j) => (
                                                            <Star key={j} size={12} fill={j < r.rating ? 'var(--power-500)' : 'none'} color={j < r.rating ? 'var(--power-500)' : 'var(--border)'} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            {r.comment && <p className="coach-review-comment">{r.comment}</p>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {Object.values(coach.social || {}).some(Boolean) && (
                            <section className="coach-section coach-social-section">
                                <h2>Social</h2>
                                <div className="coach-social-links">
                                    {coach.social?.instagram && (
                                        <a href={`https://instagram.com/${coach.social.instagram}`} target="_blank" rel="noopener noreferrer" className="coach-social-link">
                                            <Camera size={16} /> Instagram
                                        </a>
                                    )}
                                    {coach.social?.youtube && (
                                        <a href={`https://youtube.com/${coach.social.youtube}`} target="_blank" rel="noopener noreferrer" className="coach-social-link">
                                            <CirclePlay size={16} /> YouTube
                                        </a>
                                    )}
                                    {coach.social?.website && (
                                        <a href={coach.social.website} target="_blank" rel="noopener noreferrer" className="coach-social-link">
                                            <ExternalLink size={16} /> Website
                                        </a>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
