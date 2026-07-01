import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Camera, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import './ClientPhotos.css'

const PHOTO_TYPES = ['front', 'side', 'back', 'full']

export default function ClientPhotos({ clientId }) {
  const { showToast } = useToast()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareBefore, setCompareBefore] = useState(null)
  const [compareAfter, setCompareAfter] = useState(null)
  const [sliderPos, setSliderPos] = useState(50)
  const [selectedType, setSelectedType] = useState('all')
  const sliderRef = useRef(null)
  const dragging = useRef(false)

  const loadPhotos = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const data = await apiFetch(`/coach/clients/${clientId}/photos`)
      setPhotos(Array.isArray(data) ? data : [])
    } catch {
      showToast('Error loading photos')
    } finally {
      setLoading(false)
    }
  }, [clientId, showToast])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  const grouped = {}
  const filtered = selectedType === 'all' ? photos : photos.filter(p => p.photoType === selectedType)
  filtered.forEach(p => {
    const type = p.photoType || 'other'
    if (!grouped[type]) grouped[type] = []
    grouped[type].push(p)
  })

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function openCompare(photo) {
    const others = photos.filter(p => p.id !== photo.id)
    if (others.length === 0) {
      showToast('Need at least two photos to compare')
      return
    }
    setCompareBefore(others[others.length - 1])
    setCompareAfter(photo)
    setSliderPos(50)
    setCompareOpen(true)
  }

  const handleMouseDown = () => { dragging.current = true }
  const handleMouseUp = () => { dragging.current = false }

  const handleMouseMove = (e) => {
    if (!dragging.current || !sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPos(pct)
  }

  const handleTouchMove = (e) => {
    if (!sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    const x = e.touches[0].clientX - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPos(pct)
  }

  return (
    <div className="cp-container">
      <div className="cp-header">
        <h2 className="cp-title">
          <Camera size={22} /> Progress Photos
        </h2>
      </div>

      <div className="cp-type-tabs">
        <button
          className={`cp-type-tab ${selectedType === 'all' ? 'cp-active' : ''}`}
          onClick={() => setSelectedType('all')}
        >
          All
        </button>
        {PHOTO_TYPES.map(t => (
          <button
            key={t}
            className={`cp-type-tab ${selectedType === t ? 'cp-active' : ''}`}
            onClick={() => setSelectedType(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="cp-loading">Loading photos...</div>
      ) : filtered.length === 0 ? (
        <div className="cp-empty">
          <Camera size={48} />
          <p>No photos found</p>
        </div>
      ) : (
        <div className="cp-groups">
          {Object.entries(grouped).map(([type, typePhotos]) => (
            <div key={type} className="cp-group">
              <h3 className="cp-group-title">{type.charAt(0).toUpperCase() + type.slice(1)}</h3>
              <div className="cp-grid">
                {typePhotos.map(photo => (
                  <div key={photo.id} className="cp-card" onClick={() => openCompare(photo)}>
                    <div className="cp-card-img-wrap">
                      <img loading="lazy" src={photo.photoUrl} alt={type} className="cp-card-img" />
                      <span className="cp-card-date">
                        <Calendar size={12} />
                        {formatDate(photo.takenAt || photo.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {compareOpen && compareBefore && compareAfter && (
        <div className="cp-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCompareOpen(false) }}>
          <div className="cp-compare-modal">
            <div className="cp-compare-header">
              <h3>Before / After</h3>
              <button className="cp-close-btn" onClick={() => setCompareOpen(false)}>
                <ChevronRight size={20} />
              </button>
            </div>
            <div
              className="cp-compare-slider"
              ref={sliderRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              <div className="cp-compare-after">
                <img loading="lazy" src={compareAfter.photoUrl} alt="After" />
                <span className="cp-compare-label cp-label-after">After</span>
              </div>
              <div
                className="cp-compare-before"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <img loading="lazy" src={compareBefore.photoUrl} alt="Before" />
                <span className="cp-compare-label cp-label-before">Before</span>
              </div>
              <div
                className="cp-compare-handle"
                style={{ left: `${sliderPos}%` }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
              >
                <div className="cp-handle-line" />
                <div className="cp-handle-knob">
                  <ChevronLeft size={16} />
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
            <div className="cp-compare-dates">
              <span>Before: {formatDate(compareBefore.takenAt || compareBefore.createdAt)}</span>
              <span>After: {formatDate(compareAfter.takenAt || compareAfter.createdAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
