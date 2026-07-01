import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, User } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import DOMPurify from 'dompurify'
import './Blog.css'

export default function BlogArticle() {
    const { slug } = useParams()
    const [article, setArticle] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        apiFetch(`/blog/${slug}`)
            .then(setArticle)
            .catch(() => { setArticle(null) })
            .finally(() => setLoading(false))
    }, [slug])

    if (loading) return <div className="blog-article-loading"><div className="cl-spinner" /></div>
    if (!article) return <div className="blog-article-loading"><p>Artículo no encontrado</p><Link to="/blog">Volver al blog</Link></div>

    return (
        <div className="blog-article-page">
            <div className="container">
                <Link to="/blog" className="blog-back"><ArrowLeft size={18} /> Volver al blog</Link>
                <article className="blog-article">
                    <div className="blog-article-header">
                        <span className="blog-card-cat">{article.category || 'General'}</span>
                        <h1 className="blog-article-title">{article.title}</h1>
                        <div className="blog-article-meta">
                            <span><User size={14} /> {article.author_name || 'FitPower Team'}</span>
                            <span><Calendar size={14} /> {article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}</span>
                        </div>
                    </div>
                    {article.cover_image && <img loading="lazy" src={article.cover_image} alt={article.title} className="blog-article-cover" />}
                    <div className="blog-article-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }} />
                    {article.tags?.length > 0 && (
                        <div className="blog-article-tags">
                            {article.tags.map(t => <span key={t} className="blog-tag">{t}</span>)}
                        </div>
                    )}
                </article>
            </div>
        </div>
    )
}
