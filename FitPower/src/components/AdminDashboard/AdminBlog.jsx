import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { FileText, Plus, X, Eye, Archive } from 'lucide-react'
import DOMPurify from 'dompurify'

const emptyForm = { title: '', slug: '', content: '', excerpt: '', cover_image: '', category: '', tags: '', status: 'draft' }

export default function AdminBlog() {
    const { showToast } = useToast()
    const [articles, setArticles] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ ...emptyForm })
    const [previewOpen, setPreviewOpen] = useState(false)

    useEffect(() => {
        apiFetch('/blog').then(d => setArticles(d.articles || d.data || [])).catch(() => {})
    }, [])

    const openCreate = () => { setEditId(null); setForm({ ...emptyForm }); setModalOpen(true) }

    const openEdit = (a) => {
        setEditId(a.id)
        setForm({ title: a.title, slug: a.slug || '', content: a.content || '', excerpt: a.excerpt || '', cover_image: a.cover_image || '', category: a.category || '', tags: Array.isArray(a.tags) ? a.tags.join(', ') : a.tags || '', status: a.status || 'draft' })
        setModalOpen(true)
    }

    const handleSave = async () => {
        if (!form.title) { showToast('Title is required'); return }
        const body = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }
        try {
            if (editId) { await apiFetch(`/blog/${editId}`, { method: 'PUT', body: JSON.stringify(body) }); showToast('Article updated') }
            else { await apiFetch('/blog', { method: 'POST', body: JSON.stringify(body) }); showToast('Article created') }
            setModalOpen(false); apiFetch('/blog').then(d => setArticles(d.articles || d.data || [])).catch(() => {})
        } catch (e) { showToast(e.message || 'Error') }
    }

    const deleteArticle = async (id) => {
        if (!confirm('Delete this article?')) return
        try { await apiFetch(`/blog/${id}`, { method: 'DELETE' }); showToast('Article deleted'); apiFetch('/blog').then(d => setArticles(d.articles || d.data || [])).catch(() => {}) }
        catch (e) { showToast(e.message || 'Error') }
    }

    const toggleStatus = async (a) => {
        const newStatus = a.status === 'published' ? 'draft' : 'published'
        try { await apiFetch(`/blog/${a.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) }); showToast(`Article ${newStatus}`); apiFetch('/blog').then(d => setArticles(d.articles || d.data || [])).catch(() => {}) }
        catch (e) { showToast(e.message || 'Error') }
    }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><FileText size={24} /> Blog CMS</h1>
                <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={openCreate}><Plus size={16} /> New Article</button>
            </div>
            <div className="ad-dash-card" style={{ margin: '24px' }}>
                {articles.map(a => (
                    <div key={a.id} className="ad-prog-item" style={{ borderBottom: '1px solid rgba(255,255,255,.05)', padding: '16px 0', cursor: 'pointer' }}>
                        <div className="ad-prog-info" style={{ flex: 1 }} onClick={() => openEdit(a)}>
                            <div className="ad-prog-name">{a.title}</div>
                            <div className="ad-prog-enroll">{a.category || 'Uncategorized'} · {a.author_name || 'Admin'} · {a.published_at ? new Date(a.published_at).toLocaleDateString() : 'N/A'}</div>
                        </div>
                        <span className={'ad-status-badge ad-status-' + (a.status === 'published' ? 'active' : a.status === 'archived' ? 'cancelled' : 'pending')} style={{ marginRight: 12 }}>{a.status}</span>
                        <button className="ad-btn ad-btn-secondary ad-btn-xs" style={{ marginRight: 4 }} onClick={() => toggleStatus(a)}>
                            {a.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => deleteArticle(a.id)}><Archive size={14} /></button>
                    </div>
                ))}
                {articles.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#737373' }}>No articles yet</div>}
            </div>

            <div className={'ad-modal-overlay' + (modalOpen ? ' ad-modal-open' : '')} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
                <div className="ad-modal-content" style={{ maxWidth: 640 }}>
                    <div className="ad-modal-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <h3 className="ad-modal-title">{editId ? 'Edit Article' : 'New Article'}</h3>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="ad-btn ad-btn-secondary ad-btn-xs" onClick={() => setPreviewOpen(true)} disabled={!form.content}><Eye size={14} /> Preview</button>
                            <button className="ad-modal-close" onClick={() => setModalOpen(false)}><X /></button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        <input className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} placeholder="Slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
                        <textarea className="ad-content-search" style={{ width: '100%', minWidth: 'unset', minHeight: 200, resize: 'vertical' }} placeholder="Content (HTML supported)" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                        <textarea className="ad-content-search" style={{ width: '100%', minWidth: 'unset', minHeight: 60, resize: 'vertical' }} placeholder="Excerpt" value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} placeholder="Cover image URL" value={form.cover_image} onChange={e => setForm({ ...form, cover_image: e.target.value })} />
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                        </div>
                        <input className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
                        <select className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                        </select>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                            <button className="ad-btn ad-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="ad-btn ad-btn-primary" onClick={handleSave}>{editId ? 'Update' : 'Create'} Article</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={'ad-modal-overlay' + (previewOpen ? ' ad-modal-open' : '')} onClick={e => { if (e.target === e.currentTarget) setPreviewOpen(false) }}>
                <div className="ad-modal-content" style={{ maxWidth: 640, maxHeight: '80vh' }}>
                    <div className="ad-modal-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <h3 className="ad-modal-title">Preview: {form.title}</h3>
                        <button className="ad-modal-close" onClick={() => setPreviewOpen(false)}><X /></button>
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.content) }} style={{ color: '#d4d4d4', fontSize: 14, lineHeight: 1.7 }} />
                </div>
            </div>
        </div>
    )
}
