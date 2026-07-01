import { useState, useEffect, useCallback } from 'react'
import { Star } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import './ProgramReviews.css'

export default function ProgramReviews({ programId }) {
    const { showToast } = useToast()
    const [reviews, setReviews] = useState([])
    const [avgRating, setAvgRating] = useState(0)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [myRating, setMyRating] = useState(0)
    const [myComment, setMyComment] = useState('')
    const [showForm, setShowForm] = useState(false)

    const loadReviews = useCallback(() => {
        apiFetch(`/program-reviews/${programId}`)
            .then(d => {
                setReviews(d.reviews || [])
                setAvgRating(d.avgRating || 0)
                setTotal(d.total || 0)
            })
            .finally(() => setLoading(false))
    }, [programId])

    useEffect(() => { if (programId) loadReviews() }, [loadReviews, programId])

    const submitReview = async () => {
        if (!myRating) return showToast('Select a rating')
        try {
            await apiFetch('/program-reviews', {
                method: 'POST',
                body: JSON.stringify({ programId: parseInt(programId), rating: myRating, comment: myComment })
            })
            showToast('Review saved')
            setShowForm(false)
            setMyRating(0)
            setMyComment('')
            loadReviews()
        } catch (e) { showToast(e.message) }
    }

    return (
        <div className="pr-section">
            <div className="pr-header">
                <div className="pr-summary">
                    <div className="pr-avg">{avgRating}</div>
                    <div className="pr-stars">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={16} fill={s <= Math.round(avgRating) ? 'var(--power-500)' : 'none'} color={s <= Math.round(avgRating) ? 'var(--power-500)' : 'var(--border-color)'} />
                        ))}
                    </div>
                    <div className="pr-total">{total} reviews</div>
                </div>
                <button className="pr-add-btn" onClick={() => setShowForm(!showForm)}>
                    <Star size={16} /> {showForm ? 'Cancel' : 'Rate'}
                </button>
            </div>
            {showForm && (
                <div className="pr-form">
                    <div className="pr-form-stars">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={28} fill={s <= myRating ? 'var(--power-500)' : 'none'} color={s <= myRating ? 'var(--power-500)' : 'var(--border-color)'} cursor="pointer" onClick={() => setMyRating(s)} />
                        ))}
                    </div>
                    <textarea value={myComment} onChange={e => setMyComment(e.target.value)} placeholder="Write your review (optional)" rows={3} />
                    <button className="pr-submit-btn" onClick={submitReview}>Submit Review</button>
                </div>
            )}
            <div className="pr-list">
                {loading ? <p className="pr-loading">Loading...</p> : reviews.length === 0 ? (
                    <p className="pr-empty">Be the first to rate this program</p>
                ) : reviews.map(r => (
                    <div key={r.id} className="pr-review">
                        <div className="pr-review-user">
                            <div className="pr-review-avatar" style={{ background: `hsl(${r.user_id * 40}, 60%, 50%)` }}>{r.user_name?.[0]}</div>
                            <div>
                                <div className="pr-review-name">{r.user_name}</div>
                                <div className="pr-review-stars">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={12} fill={s <= r.rating ? 'var(--power-500)' : 'none'} color={s <= r.rating ? 'var(--power-500)' : 'var(--border-color)'} />
                                    ))}
                                </div>
                            </div>
                            <span className="pr-review-date">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        {r.comment && <p className="pr-review-comment">{r.comment}</p>}
                    </div>
                ))}
            </div>
        </div>
    )
}
