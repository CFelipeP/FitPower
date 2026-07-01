import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ArrowLeft, Search } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import './Blog.css'

export default function Blog() {
    const [articles, setArticles] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        apiFetch('/blog')
            .then(d => setArticles(d.articles || []))
            .catch(() => setArticles([]))
            .finally(() => setLoading(false))
    }, [])

    const filtered = articles.filter(a =>
        !search || a.title.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="blog-page">
            <div className="blog-header">
                <Link to="/" className="blog-back"><ArrowLeft size={18} /> Home</Link>
                <h1 className="blog-title">FitPower Blog</h1>
                <p className="blog-subtitle">Tips, workouts, nutrition, and more for your best self</p>
                <div className="blog-search">
                    <Search size={18} />
                    <input type="text" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>
            <div className="blog-grid container">
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="blog-card blog-skeleton"><div className="blog-skel-img" /><div className="blog-skel-title" /><div className="blog-skel-text" /></div>
                )) : filtered.length === 0 ? (
                    <div className="blog-empty">No articles found</div>
                ) : filtered.map(a => (
                    <Link to={`/blog/${a.slug}`} key={a.id} className="blog-card">
                        <div className="blog-card-img" style={{ background: a.cover_image ? `url(${a.cover_image}) center/cover` : 'var(--power-500)' }}>
                            <span className="blog-card-cat">{a.category || 'General'}</span>
                        </div>
                        <div className="blog-card-body">
                            <div className="blog-card-meta"><Calendar size={12} /> {a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}</div>
                            <h3 className="blog-card-title">{a.title}</h3>
                            <p className="blog-card-excerpt">{a.excerpt || ''}</p>
                            <div className="blog-card-author">{a.author_name || 'FitPower Team'}</div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
