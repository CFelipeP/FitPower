import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Heart, Eye, Plus, ArrowLeft, Send } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import './Forum.css'

export default function Forum() {
    const { showToast } = useToast()
    const [topics, setTopics] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState('')
    const [showNewTopic, setShowNewTopic] = useState(false)
    const [selectedTopic, setSelectedTopic] = useState(null)
    const [newTitle, setNewTitle] = useState('')
    const [newContent, setNewContent] = useState('')
    const [replyContent, setReplyContent] = useState('')

    const loadTopics = useCallback(async () => {
        const url = '/forum/topics' + (activeCategory ? `?category=${activeCategory}` : '')
        const d = await apiFetch(url)
        setTopics(d.topics || [])
    }, [activeCategory])

    useEffect(() => {
        apiFetch('/forum/categories').then(d => setCategories(d || [])).catch(() => setCategories([]))
        const url = '/forum/topics' + (activeCategory ? `?category=${activeCategory}` : '')
        apiFetch(url).then(d => setTopics(d.topics || [])).catch(() => setTopics([])).finally(() => setLoading(false))
    }, [activeCategory])

    const createTopic = async () => {
        if (!newTitle.trim() || !newContent.trim()) return
        try {
            await apiFetch('/forum/topics', { method: 'POST', body: JSON.stringify({ title: newTitle, content: newContent, category: activeCategory || null }) })
            showToast('Topic created')
            setNewTitle('')
            setNewContent('')
            setShowNewTopic(false)
            loadTopics()
        } catch (e) { showToast(e.message) }
    }

    const openTopic = async (id) => {
        try {
            const d = await apiFetch(`/forum/topics/${id}`)
            if (d?.topic) setSelectedTopic(d)
            else showToast('Topic not found')
        } catch (e) { showToast(e.message) }
    }

    const sendReply = async () => {
        if (!replyContent.trim()) return
        try {
            if (!selectedTopic?.topic?.id) return
            await apiFetch(`/forum/replies?topic_id=${selectedTopic.topic.id}`, { method: 'POST', body: JSON.stringify({ content: replyContent }) })
            showToast('Reply posted')
            setReplyContent('')
            openTopic(selectedTopic.topic.id)
        } catch (e) { showToast(e.message) }
    }

    const toggleLike = async (replyId) => {
        if (!selectedTopic?.topic?.id) return
        try {
            await apiFetch(`/forum/likes?reply_id=${replyId}`, { method: 'POST' })
            openTopic(selectedTopic.topic.id)
        } catch (e) { showToast(e.message) }
    }

    if (selectedTopic) {
        const { topic, replies, likedReplies } = selectedTopic
        return (
            <div className="forum-page">
                <div className="container">
                    <button className="forum-back" onClick={() => setSelectedTopic(null)}><ArrowLeft size={18} /> Back</button>
                    <div className="forum-topic-view">
                        <div className="forum-topic-header">
                            <h1 className="forum-topic-title">{topic.title}</h1>
                            <div className="forum-topic-meta">
                                <span>{topic.user_name}</span>
                                <span>{new Date(topic.created_at).toLocaleDateString()}</span>
                                <span><Eye size={14} /> {topic.views}</span>
                                <span><MessageSquare size={14} /> {replies?.length || 0}</span>
                            </div>
                        </div>
                        <div className="forum-topic-content">{topic.content}</div>
                        <div className="forum-replies">
                            <h3>Replies ({replies?.length || 0})</h3>
                            {replies?.map(r => (
                                <div key={r.id} className={`forum-reply ${r.is_solution ? 'forum-solution' : ''}`}>
                                    <div className="forum-reply-user">
                                        <div className="forum-reply-avatar" style={{ background: `hsl(${r.user_id * 40}, 60%, 50%)` }}>{r.user_name?.[0]}</div>
                                        <div>
                                            <div className="forum-reply-name">{r.user_name}</div>
                                            <div className="forum-reply-date">{new Date(r.created_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="forum-reply-content">{r.content}</div>
                                    <button className={`forum-like-btn ${likedReplies?.includes(r.id) ? 'liked' : ''}`} onClick={() => toggleLike(r.id)}>
                                        <Heart size={14} fill={likedReplies?.includes(r.id) ? 'var(--power-500)' : 'none'} /> {r.like_count || 0}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="forum-reply-form">
                            <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="Write your reply..." rows={3} />
                            <button className="forum-btn" onClick={sendReply}><Send size={16} /> Publish</button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="forum-page">
            <div className="forum-header">
                <h1 className="forum-title">FitPower Community</h1>
                <p className="forum-subtitle">Share, learn, and connect with other athletes</p>
                <button className="forum-btn forum-btn-primary" onClick={() => setShowNewTopic(!showNewTopic)}>
                    <Plus size={18} /> New Topic
                </button>
            </div>
            <div className="container">
                <div className="forum-cats">
                    <button className={`forum-cat ${!activeCategory ? 'active' : ''}`} onClick={() => setActiveCategory('')}>All</button>
                    {categories.map(c => (
                        <button key={c} className={`forum-cat ${activeCategory === c ? 'active' : ''}`} onClick={() => setActiveCategory(c)}>{c}</button>
                    ))}
                </div>
                {showNewTopic && (
                    <div className="forum-new-topic">
                        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Topic title" />
                        <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Content..." rows={4} />
                        <button className="forum-btn" onClick={createTopic}>Create Topic</button>
                    </div>
                )}
                <div className="forum-list">
                    {loading ? <p className="forum-loading">Loading...</p> : topics.length === 0 ? <p className="forum-empty">No topics yet. Be the first!</p> : topics.map(t => (
                        <div key={t.id} className="forum-topic" onClick={() => openTopic(t.id)}>
                            <div className="forum-topic-info">
                                <h3 className="forum-topic-name">{t.is_pinned ? '📌 ' : ''}{t.title}</h3>
                                <div className="forum-topic-details">
                                    <span>{t.user_name}</span>
                                    {t.category && <span className="forum-topic-cat">{t.category}</span>}
                                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="forum-topic-stats">
                                <span><MessageSquare size={14} /> {t.reply_count || 0}</span>
                                <span><Eye size={14} /> {t.views || 0}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
