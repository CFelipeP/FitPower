import { useState, useEffect } from 'react'
import { X, Users, Search, Mail, Calendar, Crown } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import './ClientList.css'

export default function ClientList({ onSelectClient }) {
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedClient, setSelectedClient] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        apiFetch('/clients')
            .then(d => setClients(d.clients || []))
            .finally(() => setLoading(false))
    }, [])

    const filtered = clients.filter(c => {
        if (!searchTerm) return true
        const q = searchTerm.toLowerCase()
        return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    })

    const openDetail = async (id) => {
        try {
            const data = await apiFetch(`/clients/${id}`)
            setSelectedClient(data)
        } catch {
            const fallback = clients.find(c => c.id === id)
            setSelectedClient(fallback || {})
        }
        if (onSelectClient) onSelectClient(id)
    }

    return (
        <div className="clist-page">
            <div className="clist-header">
                <div>
                    <h1 className="clist-title">My Clients</h1>
                    <p className="clist-subtitle">{clients.length} clients · Manage your roster</p>
                </div>
                <div className="clist-search-wrap">
                    <Search className="clist-search-icon" />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        className="clist-search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="clist-loading">Loading...</div>
            ) : filtered.length === 0 ? (
                <div className="clist-empty">
                    <Users size={48} />
                    <h3>No clients found</h3>
                    <p>{searchTerm ? 'Try a different search term' : 'Clients will appear here once they enroll in your programs'}</p>
                </div>
            ) : (
                <div className="clist-grid">
                    {filtered.map(c => (
                        <div key={c.id} className="clist-card" onClick={() => openDetail(c.id)}>
                            <div className="clist-card-avatar" style={{ background: `hsl(${(c.id || 0) * 40}, 60%, 50%)` }}>
                                {c.name?.[0] || '?'}
                            </div>
                            <div className="clist-card-body">
                                <div className="clist-card-name">{c.name}</div>
                                <div className="clist-card-email"><Mail size={12} /> {c.email}</div>
                                <div className="clist-card-meta">
                                    <span className={`clist-tier clist-tier-${(c.tier || 'starter').toLowerCase()}`}>
                                        <Crown size={10} /> {c.tier || 'Starter'}
                                    </span>
                                    <span className={`clist-status clist-status-${(c.status || 'active').toLowerCase()}`}>
                                        <span className="clist-status-dot" /> {c.status || 'Active'}
                                    </span>
                                </div>
                                {c.lastActive && (
                                    <div className="clist-card-active">
                                        <Calendar size={12} /> Last active: {c.lastActive}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className={`clist-modal-overlay${selectedClient ? ' clist-modal-open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setSelectedClient(null) }}>
                <div className="clist-modal">
                    <div className="clist-modal-hdr">
                        <h3 className="clist-modal-title">Client Details</h3>
                        <button className="clist-modal-close" onClick={() => setSelectedClient(null)}><X /></button>
                    </div>
                    {selectedClient && (
                        <>
                            <div className="clist-modal-profile">
                                <div className="clist-modal-avatar" style={{ background: `hsl(${(selectedClient.id || 0) * 40}, 60%, 50%)` }}>
                                    {selectedClient.name?.[0] || '?'}
                                </div>
                                <div>
                                    <div className="clist-modal-name">{selectedClient.name}</div>
                                    <div className="clist-modal-email">{selectedClient.email}</div>
                                </div>
                            </div>
                            <div className="clist-modal-info">
                                {[
                                    { label: 'Tier', value: selectedClient.tier || 'Starter' },
                                    { label: 'Status', value: selectedClient.status || 'Active' },
                                    { label: 'Last Active', value: selectedClient.lastActive || 'Today' },
                                    { label: 'Program', value: selectedClient.program || 'Not enrolled' },
                                    { label: 'Progress', value: selectedClient.progress != null ? selectedClient.progress + '%' : '—' },
                                ].map(info => (
                                    <div key={info.label} className="clist-modal-row">
                                        <span className="clist-modal-label">{info.label}</span>
                                        <span className="clist-modal-value">{info.value}</span>
                                    </div>
                                ))}
                            </div>
                            {selectedClient.bio && (
                                <div className="clist-modal-bio">
                                    <div className="clist-modal-label">Notes</div>
                                    <p>{selectedClient.bio}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
