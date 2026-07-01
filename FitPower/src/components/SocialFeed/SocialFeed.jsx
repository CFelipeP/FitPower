import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Heart, MessageCircle, Send, UserPlus, Award, Dumbbell, Zap, Loader } from 'lucide-react'
import './SocialFeed.css'

export default function SocialFeed({ compact = false }) {
    const { showToast } = useToast()
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [newPost, setNewPost] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [commentInputs, setCommentInputs] = useState({})
    const [expandedComments, setExpandedComments] = useState(new Set())

    useEffect(() => { loadFeed() }, [])

    async function loadFeed() {
        try {
            const data = await apiFetch('/social/feed')
            setPosts(data)
        } catch { /* ignore */ } finally { setLoading(false) }
    }

    async function handlePost() {
        if (!newPost.trim()) return
        setSubmitting(true)
        try {
            await apiFetch('/social/posts', {
                method: 'POST',
                body: JSON.stringify({ content: newPost, type: 'status' })
            })
            setNewPost('')
            showToast('Posted!')
            loadFeed()
        } catch { showToast('Error creating post') }
        finally { setSubmitting(false) }
    }

    async function handleLike(postId) {
        try {
            const res = await apiFetch('/social/like', {
                method: 'POST',
                body: JSON.stringify({ post_id: postId })
            })
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_me: res.liked, likes_count: res.liked ? p.likes_count + 1 : p.likes_count - 1 } : p))
        } catch { /* ignore */ }
    }

    async function handleComment(postId) {
        const content = commentInputs[postId]
        if (!content?.trim()) return
        try {
            await apiFetch('/social/comment', {
                method: 'POST',
                body: JSON.stringify({ post_id: postId, content })
            })
            setCommentInputs(prev => ({ ...prev, [postId]: '' }))
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
            loadFeed()
        } catch { showToast('Error adding comment') }
    }

    function formatTime(dateStr) {
        const d = new Date(dateStr)
        const now = new Date()
        const diff = (now - d) / 1000
        if (diff < 60) return 'just now'
        if (diff < 3600) return Math.floor(diff / 60) + 'm'
        if (diff < 86400) return Math.floor(diff / 3600) + 'h'
        return d.toLocaleDateString()
    }

    if (loading) return <div className="social-feed-loading"><Loader size={24} className="spin" /></div>

    return (
        <div className={`social-feed ${compact ? 'social-feed-compact' : ''}`}>
            {!compact && (
                <div className="social-feed-composer">
                    <div className="social-feed-composer-input-row">
                        <input
                            className="social-feed-input"
                            placeholder="Share something with your followers..."
                            value={newPost}
                            onChange={e => setNewPost(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handlePost()}
                        />
                        <button className="social-feed-post-btn" onClick={handlePost} disabled={submitting || !newPost.trim()}>
                            {submitting ? <Loader size={16} className="spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            )}
            <div className="social-feed-posts">
                {posts.length === 0 && (
                    <div className="social-feed-empty">
                        <Zap size={32} />
                        <p>No posts yet. Follow other athletes to see their updates!</p>
                    </div>
                )}
                {posts.map(post => (
                    <div key={post.id} className="social-feed-post">
                        <div className="social-feed-post-header">
                            <div className="social-feed-avatar">
                                {post.photo && (post.photo.startsWith('http://') || post.photo.startsWith('https://')) ? <img loading="lazy" src={post.photo} alt="" /> : <UserPlus size={18} />}
                            </div>
                            <div className="social-feed-post-author">
                                <span className="social-feed-author-name">{post.first_name} {post.last_name}</span>
                                <span className="social-feed-post-time">{formatTime(post.created_at)}</span>
                            </div>
                            {post.type === 'achievement' && <Award size={16} className="social-feed-type-icon" />}
                            {post.type === 'workout' && <Dumbbell size={16} className="social-feed-type-icon" />}
                        </div>
                        <div className="social-feed-post-content">{post.content}</div>
                        <div className="social-feed-post-actions">
                            <button className={`social-feed-action-btn ${post.liked_by_me ? 'liked' : ''}`} onClick={() => handleLike(post.id)}>
                                <Heart size={16} fill={post.liked_by_me ? 'var(--power-500)' : 'none'} />
                                <span>{post.likes_count || 0}</span>
                            </button>
                            <button className="social-feed-action-btn" onClick={() => setExpandedComments(prev => { const next = new Set(prev); if (next.has(post.id)) next.delete(post.id); else next.add(post.id); return next; })}>
                                <MessageCircle size={16} />
                                <span>{post.comments_count || 0}</span>
                            </button>
                        </div>
                        {expandedComments.has(post.id) && (
                        <div className="social-feed-comment-input-row">
                            <input
                                className="social-feed-comment-input"
                                placeholder="Write a comment..."
                                value={commentInputs[post.id] || ''}
                                onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                            />
                        </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
