import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { Plus, X, Edit2, Star } from 'lucide-react'

const emptyForm = { name: '', price: '', interval: 'monthly', features: '', is_popular: false }

export default function AdminPlans() {
    const { showToast } = useToast()
    const [plans, setPlans] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ ...emptyForm })

    useEffect(() => {
        apiFetch('/admin/plans').then(d => setPlans(d.plans || d.data || [])).catch(() => {})
    }, [])

    const openCreate = () => { setEditId(null); setForm({ ...emptyForm }); setModalOpen(true) }

    const openEdit = (plan) => {
        setEditId(plan.id)
        setForm({ name: plan.name, price: String(plan.price), interval: plan.interval || 'monthly', features: Array.isArray(plan.features) ? plan.features.join('\n') : plan.features || '', is_popular: plan.is_popular || false })
        setModalOpen(true)
    }

    const handleSave = async () => {
        if (!form.name || !form.price) { showToast('Name and price required'); return }
        const body = { ...form, price: parseFloat(form.price), features: form.features.split('\n').filter(Boolean) }
        try {
            if (editId) { await apiFetch(`/admin/plans/${editId}`, { method: 'PUT', body: JSON.stringify(body) }); showToast('Plan updated') }
            else { await apiFetch('/admin/plans', { method: 'POST', body: JSON.stringify(body) }); showToast('Plan created') }
            setModalOpen(false)
            apiFetch('/admin/plans').then(d => setPlans(d.plans || d.data || [])).catch(() => {})
        } catch (e) { showToast(e.message || 'Error saving plan') }
    }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><Star size={24} /> Subscription Plans</h1>
                <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={openCreate}><Plus size={16} /> Add Plan</button>
            </div>
            <div className="ad-section-grid" style={{ padding: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {plans.map(plan => (
                    <div key={plan.id} className="ad-dash-card ad-kpi-card" style={{ textAlign: 'left', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>{plan.name}</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--power-500)', marginTop: 8 }}>${plan.price}<span style={{ fontSize: 14, color: '#737373', fontWeight: 400 }}>/{plan.interval}</span></div>
                            </div>
                            {plan.is_popular && <span className="ad-status-badge ad-status-active">Popular</span>}
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', fontSize: 13, color: '#a3a3a3' }}>
                            {(Array.isArray(plan.features) ? plan.features : []).map((f, i) => <li key={i} style={{ padding: '4px 0' }}>✓ {f}</li>)}
                        </ul>
                        <button className="ad-btn ad-btn-secondary ad-btn-xs" style={{ width: '100%', justifyContent: 'center' }} onClick={() => openEdit(plan)}><Edit2 size={14} /> Edit</button>
                    </div>
                ))}
                {plans.length === 0 && <div style={{ color: '#737373', textAlign: 'center', padding: 32 }}>No plans yet</div>}
            </div>

            <div className={'ad-modal-overlay' + (modalOpen ? ' ad-modal-open' : '')} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
                <div className="ad-modal-content">
                    <div className="ad-modal-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <h3 className="ad-modal-title">{editId ? 'Edit Plan' : 'Add Plan'}</h3>
                        <button className="ad-modal-close" onClick={() => setModalOpen(false)}><X /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <input className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} placeholder="Plan name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <input className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                            <select className="ad-content-search" style={{ flex: 1, minWidth: 'unset' }} value={form.interval} onChange={e => setForm({ ...form, interval: e.target.value })}>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                                <option value="weekly">Weekly</option>
                            </select>
                        </div>
                        <textarea className="ad-content-search" style={{ width: '100%', minWidth: 'unset', minHeight: 100, resize: 'vertical' }} placeholder="Features (one per line)" value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a3a3a3', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.is_popular} onChange={e => setForm({ ...form, is_popular: e.target.checked })} style={{ accentColor: 'var(--power-500)' }} />
                            Mark as popular
                        </label>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                            <button className="ad-btn ad-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="ad-btn ad-btn-primary" onClick={handleSave}>{editId ? 'Update' : 'Create'} Plan</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
