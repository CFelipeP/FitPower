import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { apiFetch } from '../../lib/api'
import { confirmSwal, swalError } from '../../lib/alerts'
import { Plus, X, Trash2, Edit2 } from 'lucide-react'

const emptyForm = { code: '', discount_pct: '', discount_amount: '', plan_id: '', max_uses: '', expires_at: '', is_active: true }

export default function AdminCoupons() {
    const { showToast } = useToast()
    const [coupons, setCoupons] = useState([])
    const [plans, setPlans] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ ...emptyForm })

    useEffect(() => {
        apiFetch('/admin/coupons').then(d => setCoupons(Array.isArray(d) ? d : (d.coupons || d.data || []))).catch(() => {})
        apiFetch('/admin/plans').then(d => setPlans(Array.isArray(d) ? d : (d.plans || d.data || []))).catch(() => {})
    }, [])

    const openCreate = () => { setEditId(null); setForm({ ...emptyForm }); setModalOpen(true) }

    const openEdit = (coupon) => {
        setEditId(coupon.id)
        setForm({ code: coupon.code, discount_pct: String(coupon.discount_pct || ''), discount_amount: String(coupon.discount_amount || ''), plan_id: String(coupon.plan_id || ''), max_uses: String(coupon.max_uses || ''), expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '', is_active: coupon.is_active !== 0 })
        setModalOpen(true)
    }

    const handleSave = async () => {
        if (!form.code) { swalError('Code is required'); return }
        if (!parseFloat(form.discount_pct) && !parseFloat(form.discount_amount)) { swalError('Set a discount % or amount'); return }
        const body = { code: form.code, discountPct: form.discount_pct ? parseFloat(form.discount_pct) : null, discountAmount: form.discount_amount ? parseFloat(form.discount_amount) : null, planId: form.plan_id ? parseInt(form.plan_id) : null, maxUses: form.max_uses ? parseInt(form.max_uses) : null, expiresAt: form.expires_at || null, isActive: form.is_active }
        try {
            if (editId) { await apiFetch(`/admin/coupons/${editId}`, { method: 'PUT', body: JSON.stringify(body) }); showToast('Coupon updated') }
            else { await apiFetch('/admin/coupons', { method: 'POST', body: JSON.stringify(body) }); showToast('Coupon created') }
            setModalOpen(false); apiFetch('/admin/coupons').then(d => setCoupons(Array.isArray(d) ? d : (d.coupons || d.data || []))).catch(() => {})
        } catch (e) { swalError(e.message || 'Error') }
    }

    const deleteCoupon = async (id) => {
        if (!(await confirmSwal('Delete this coupon?'))) return
        try { await apiFetch(`/admin/coupons/${id}`, { method: 'DELETE' }); showToast('Coupon deleted'); apiFetch('/admin/coupons').then(d => setCoupons(Array.isArray(d) ? d : (d.coupons || d.data || []))).catch(() => {}) }
        catch (e) { swalError(e.message || 'Error') }
    }

    return (
        <div className="ad-main-content">
            <div className="ad-content-header">
                <h1 className="ad-content-title"><Plus size={24} /> Coupons</h1>
                <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={openCreate}><Plus size={16} /> Create Coupon</button>
            </div>
            <div className="ad-dash-card" style={{ margin: '24px' }}>
                <table className="ad-table">
                    <thead><tr><th>Code</th><th>Discount %</th><th>Discount $</th><th>Plan</th><th>Uses</th><th>Max Uses</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {coupons.map(c => {
                            const expired = (c.expires_at && new Date(c.expires_at) < new Date()) || c.is_active === 0
                            const planName = plans.find(p => p.id === c.plan_id)?.name
                            return (
                                <tr key={c.id} className="ad-user-row">
                                    <td><span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--power-500)' }}>{c.code}</span></td>
                                    <td>{c.discount_pct ? c.discount_pct + '%' : '-'}</td>
                                    <td>{c.discount_amount ? '$' + c.discount_amount : '-'}</td>
                                    <td>{planName || 'All plans'}</td>
                                    <td>{c.current_uses || 0}</td>
                                    <td>{c.max_uses || '∞'}</td>
                                    <td><span className="ad-time">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}</span></td>
                                    <td><span className={'ad-status-badge ad-status-' + (expired ? 'cancelled' : 'active')}>{expired ? 'Inactive' : 'Active'}</span></td>
                                    <td>
                                        <button className="ad-btn ad-btn-secondary ad-btn-xs" style={{ marginRight: 4 }} onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                                        <button className="ad-btn ad-btn-danger ad-btn-xs" onClick={() => deleteCoupon(c.id)}><Trash2 size={14} /></button>
                                    </td>
                                </tr>
                            )
                        })}
                        {coupons.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No coupons found</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className={'ad-modal-overlay' + (modalOpen ? ' ad-modal-open' : '')} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
                <div className="ad-modal-content">
                    <div className="ad-modal-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <h3 className="ad-modal-title">{editId ? 'Edit Coupon' : 'Create Coupon'}</h3>
                        <button className="ad-modal-close" onClick={() => setModalOpen(false)}><X /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <input className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} placeholder="Coupon code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <input className="ad-content-search" style={{ flex: '1 1 180px', minWidth: 'unset' }} type="number" placeholder="Discount %" value={form.discount_pct} onChange={e => setForm({ ...form, discount_pct: e.target.value })} />
                            <input className="ad-content-search" style={{ flex: '1 1 180px', minWidth: 'unset' }} type="number" placeholder="Discount $" value={form.discount_amount} onChange={e => setForm({ ...form, discount_amount: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <input className="ad-content-search" style={{ flex: '1 1 180px', minWidth: 'unset' }} type="number" placeholder="Max uses" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} />
                            <input className="ad-content-search" style={{ flex: '1 1 180px', minWidth: 'unset' }} type="date" placeholder="Expires" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
                        </div>
                        <select className="ad-content-search" style={{ width: '100%', minWidth: 'unset' }} value={form.plan_id} onChange={e => setForm({ ...form, plan_id: e.target.value })}>
                            <option value="">All plans</option>
                            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a3a3a3', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} style={{ accentColor: 'var(--power-500)' }} />
                            Active
                        </label>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                            <button className="ad-btn ad-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="ad-btn ad-btn-primary" onClick={handleSave}>{editId ? 'Update' : 'Create'} Coupon</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
