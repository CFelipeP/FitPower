import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, Star, Award, Filter, X } from 'lucide-react'
import { useI18n } from '../../context/I18nContext'
import { apiFetch } from '../../lib/api'
import './CoachCatalog.css'

export default function CoachCatalog() {
    const { t } = useI18n()
    const [trainers, setTrainers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [specialization, setSpecialization] = useState('')
    const [modality, setModality] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [specializations, setSpecializations] = useState([])
    const [showFilters, setShowFilters] = useState(false)

    const perPage = 12

    useEffect(() => {
        apiFetch('/public/trainers/specializations')
            .then(data => { if (data?.specializations) setSpecializations(data.specializations) })
            .catch(() => {})
    }, [])

    useEffect(() => {
        setLoading(true)
        const params = new URLSearchParams({ page, perPage })
        if (search) params.set('search', search)
        if (specialization) params.set('specialization', specialization)
        if (modality) params.set('modality', modality)
        apiFetch(`/public/trainers?${params}`)
            .then(data => {
                if (data?.trainers) {
                    setTrainers(data.trainers)
                    setTotal(data.total)
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [page, search, specialization, modality])

    const totalPages = Math.ceil(total / perPage)

    const handleSearch = (e) => {
        e.preventDefault()
        setPage(1)
    }

    const clearFilters = () => {
        setSearch('')
        setSpecialization('')
        setModality('')
        setPage(1)
    }

    const hasFilters = search || specialization || modality

    const modalityOptions = [
        { value: '', label: t('common.all') },
        { value: 'online', label: 'Online' },
        { value: 'in-person', label: 'In Person' },
        { value: 'hybrid', label: 'Hybrid' },
    ]

    return (
        <div className="coach-catalog-page">
            <div className="coach-catalog-hero">
                <div className="container">
                    <h1 className="coach-catalog-title">{t('nav.coaches')}</h1>
                    <p className="coach-catalog-subtitle">Find your perfect coach and start your transformation</p>
                    <form onSubmit={handleSearch} className="coach-search-form">
                        <div className="coach-search-bar">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or keyword..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn-primary btn-shine">Search</button>
                    </form>
                </div>
            </div>

            <div className="container coach-catalog-content">
                <div className="coach-catalog-toolbar">
                    <button className="btn-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
                        <Filter size={16} /> Filters {hasFilters && <span className="filter-badge" />}
                    </button>
                    {hasFilters && (
                        <button className="btn-clear-filters" onClick={clearFilters}>
                            <X size={14} /> Clear filters
                        </button>
                    )}
                    <span className="coach-result-count">{total} coaches found</span>
                </div>

                <div className={`coach-filters ${showFilters ? 'open' : ''}`}>
                    <select value={specialization} onChange={e => { setSpecialization(e.target.value); setPage(1) }}>
                        <option value="">All Specializations</option>
                        {specializations.map(s => (
                            <option key={s.id} value={s.slug}>{s.name}</option>
                        ))}
                    </select>
                    <select value={modality} onChange={e => { setModality(e.target.value); setPage(1) }}>
                        {modalityOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="coach-grid-loading">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="coach-card-skeleton">
                                <div className="skeleton-avatar" />
                                <div className="skeleton-line w-60" />
                                <div className="skeleton-line w-40" />
                                <div className="skeleton-line w-80" />
                            </div>
                        ))}
                    </div>
                ) : trainers.length === 0 ? (
                    <div className="coach-empty">
                        <Award size={48} />
                        <h3>No coaches found</h3>
                        <p>Try adjusting your search or filters</p>
                        {hasFilters && <button className="btn-secondary" onClick={clearFilters}>Clear filters</button>}
                    </div>
                ) : (
                    <div className="coach-grid">
                        {trainers.map(trainer => (
                            <Link key={trainer.id} to={`/coaches/${trainer.id}`} className="coach-card">
                                <div className="coach-card-photo">
                                    {trainer.photo ? (
                                        <img src={trainer.photo} alt={`${trainer.firstName} ${trainer.lastName}`} />
                                    ) : (
                                        <div className="coach-card-avatar">
                                            {trainer.firstName[0]}{trainer.lastName[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="coach-card-info">
                                    <h3 className="coach-card-name">{trainer.firstName} {trainer.lastName}</h3>
                                    <div className="coach-card-rating">
                                        <Star size={14} fill="var(--power-500)" color="var(--power-500)" />
                                        <span>{trainer.avgRating > 0 ? trainer.avgRating.toFixed(1) : 'New'}</span>
                                        {trainer.reviewCount > 0 && <span className="coach-card-reviews">({trainer.reviewCount})</span>}
                                    </div>
                                    <div className="coach-card-meta">
                                        {trainer.experience && <span><Award size={12} /> {trainer.experience} years</span>}
                                        {trainer.country && <span><MapPin size={12} /> {trainer.country}</span>}
                                    </div>
                                    <div className="coach-card-specs">
                                        {trainer.specializations.slice(0, 3).map(s => (
                                            <span key={s} className="coach-spec-tag">{s}</span>
                                        ))}
                                        {trainer.specializations.length > 3 && (
                                            <span className="coach-spec-tag">+{trainer.specializations.length - 3}</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="coach-pagination">
                        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                        <span>Page {page} of {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
                    </div>
                )}
            </div>
        </div>
    )
}
