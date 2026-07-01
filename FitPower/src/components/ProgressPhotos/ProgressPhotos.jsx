import { useState, useEffect, useCallback, useRef } from 'react'
import { Camera, Plus, X, Trash2, Weight, Calendar, Upload, Link2, Tag, Scale, FileText } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import './ProgressPhotos.css'

const PHOTO_TYPES = ['front', 'back', 'side', 'full', 'other']

export default function ProgressPhotos() {
  const { showToast } = useToast()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({
    photoUrl: '',
    photoType: 'front',
    bodyWeight: '',
    notes: '',
  })
  const [capturedPreview, setCapturedPreview] = useState(null)
  const [capturedData, setCapturedData] = useState(null)
  const [captureError, setCaptureError] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const setVideoRef = useCallback((node) => {
    videoRef.current = node
    if (node && streamRef.current) {
      node.srcObject = streamRef.current
      node.play().catch(() => {})
    }
  }, [])

  const loadPhotos = useCallback(async () => {
    try {
      const result = await apiFetch('/photos')
      setPhotos(Array.isArray(result) ? result : [])
    } catch {
      showToast('Error loading photos')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (e.target.name === 'photoUrl' && e.target.value) {
      clearCapture()
    }
  }

  async function openCamera() {
    try {
      setCameraReady(false)
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      } catch {
        // Fallback to default camera if back camera is not available
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      streamRef.current = stream
      setShowCamera(true)
    } catch {
      showToast('Camera not available')
    }
  }

  async function waitForVideoReady(video) {
    if (video.readyState >= 1 || (video.videoWidth && video.videoHeight)) return true
    return new Promise((resolve) => {
      const onReady = () => {
        cleanup()
        resolve(true)
      }
      const onError = () => {
        cleanup()
        resolve(false)
      }
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onReady)
        video.removeEventListener('error', onError)
      }
      video.addEventListener('loadedmetadata', onReady)
      video.addEventListener('error', onError)
      // Timeout fallback after 5 seconds
      setTimeout(() => {
        cleanup()
        resolve(false)
      }, 5000)
    })
  }

  async function captureFrame() {
    const video = videoRef.current
    if (!video) return

    // Wait until the video has valid dimensions
    const ready = await waitForVideoReady(video)
    if (!ready || !video.videoWidth || !video.videoHeight) {
      showToast('Camera is still initializing, please wait a moment')
      return
    }

    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      ctx.drawImage(video, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
        throw new Error('Captured image is empty')
      }

      setCaptureError(false)
      setCapturedPreview(dataUrl)
      setCapturedData(dataUrl)
      closeCamera()
    } catch (err) {
      console.error('Capture error:', err)
      showToast('Failed to capture photo. Please try again.')
      setCaptureError(true)
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setShowCamera(false)
    setCameraReady(false)
  }

  function clearCapture() {
    setCapturedPreview(null)
    setCapturedData(null)
    setCaptureError(false)
  }

  useEffect(() => {
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()) }
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    try {
      const payload = {
        photoType: form.photoType,
        bodyWeight: form.bodyWeight ? parseFloat(form.bodyWeight) : null,
        notes: form.notes || null,
      }
      if (capturedData) {
        payload.photoData = capturedData
      } else {
        payload.photoUrl = form.photoUrl
      }
      await apiFetch('/photos', { method: 'POST', body: JSON.stringify(payload) })
      showToast('Photo added!')
      setAddOpen(false)
      setForm({ photoUrl: '', photoType: 'front', bodyWeight: '', notes: '' })
      clearCapture()
      loadPhotos()
    } catch {
      showToast('Error adding photo')
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/photos/${id}`, { method: 'DELETE' })
      showToast('Photo deleted')
      setLightbox(null)
      setConfirmDelete(null)
      loadPhotos()
    } catch {
      showToast('Error deleting photo')
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const selectedPhoto = lightbox ? photos.find(p => p.id === lightbox) : null

  return (
    <div className="pp-container">
      <div className="pp-header">
        <h2 className="pp-title">
          <Camera className="pp-title-icon" /> Progress Photos
        </h2>
        <button className="pp-add-btn" onClick={() => setAddOpen(true)}>
          <Plus className="pp-btn-icon" /> Add Photo
        </button>
      </div>

      {loading ? (
        <div className="pp-loading">Loading photos...</div>
      ) : photos.length === 0 ? (
        <div className="pp-empty">
          <Camera className="pp-empty-icon" />
          <p className="pp-empty-text">No progress photos yet</p>
          <p className="pp-empty-sub">Upload your first photo to track your transformation</p>
          <button className="pp-add-btn pp-empty-btn" onClick={() => setAddOpen(true)}>
            <Plus className="pp-btn-icon" /> Upload Photo
          </button>
        </div>
      ) : (
        <div className="pp-grid">
          {[...photos].reverse().map(photo => (
            <div
              key={photo.id}
              className="pp-card"
              onClick={() => setLightbox(photo.id)}
            >
              <div className="pp-card-img-wrap">
                <img loading="lazy" src={photo.photoUrl} alt={`Progress ${photo.photoType}`} className="pp-card-img" />
                <span className={'pp-badge pp-badge-' + photo.photoType?.toLowerCase()}>
                  {photo.photoType || 'Photo'}
                </span>
              </div>
              <div className="pp-card-body">
                <div className="pp-card-meta">
                  <Calendar className="pp-meta-icon" />
                  <span>{formatDate(photo.takenAt)}</span>
                </div>
                {photo.bodyWeight != null && (
                  <div className="pp-card-meta">
                    <Weight className="pp-meta-icon" />
                    <span>{photo.bodyWeight} kg</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Photo Modal */}
      {addOpen && (
        <div className="pp-overlay" onClick={(e) => { if (e.target === e.currentTarget) setAddOpen(false) }}>
          <div className="pp-modal">
            <div className="pp-modal-header">
              <div className="pp-modal-title-group">
                <div className="pp-modal-icon-circle">
                  <Camera className="pp-modal-title-icon" />
                </div>
                <div>
                  <h3 className="pp-modal-title">Add Photo</h3>
                  <p className="pp-modal-subtitle">Track your transformation</p>
                </div>
              </div>
              <button className="pp-modal-close" onClick={() => { closeCamera(); setAddOpen(false); clearCapture() }}><X size={18} /></button>
            </div>
            <form className="pp-form" onSubmit={handleAdd}>
              {/* Media upload area */}
              <div className="pp-media-area">
                {showCamera ? (
                  <div className="pp-camera-live">
                    <video
                      ref={setVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="pp-camera-video"
                      onLoadedMetadata={() => setCameraReady(true)}
                    />
                    {!cameraReady && (
                      <div className="pp-camera-loading">
                        <span className="pp-camera-loading-dot" />
                        <span className="pp-camera-loading-dot" />
                        <span className="pp-camera-loading-dot" />
                        Initializing camera...
                      </div>
                    )}
                    <div className="pp-camera-actions">
                      <button type="button" className="pp-capture-btn" onClick={captureFrame} disabled={!cameraReady}>
                        <Camera className="pp-btn-icon" /> {cameraReady ? 'Capture' : 'Initializing...'}
                      </button>
                      <button type="button" className="pp-camera-cancel" onClick={closeCamera}>
                        <X className="pp-btn-icon" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : capturedPreview ? (
                  <div className="pp-preview-wrap">
                    <img
                      src={capturedPreview}
                      alt="Preview"
                      className="pp-preview-img"
                      onError={() => setCaptureError(true)}
                      onLoad={() => setCaptureError(false)}
                    />
                    {captureError && (
                      <div className="pp-preview-error">
                        <p>Could not load preview</p>
                        <button type="button" className="pp-retake-btn" onClick={openCamera}>
                          <Camera className="pp-btn-icon" /> Retake
                        </button>
                      </div>
                    )}
                    <button type="button" className="pp-preview-clear" onClick={clearCapture}>
                      <X size={16} />
                    </button>
                    {!captureError && (
                      <button type="button" className="pp-retake-btn" onClick={openCamera}>
                        <Camera className="pp-btn-icon" /> Retake
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="pp-upload-zone">
                    <button type="button" className="pp-camera-btn" onClick={openCamera}>
                      <div className="pp-upload-icon-wrap">
                        <Camera className="pp-upload-main-icon" />
                      </div>
                      <div className="pp-upload-text">
                        <span className="pp-upload-title">Take Photo</span>
                        <span className="pp-upload-hint">Use your camera to capture progress</span>
                      </div>
                    </button>
                    <div className="pp-divider"><span>or paste a URL</span></div>
                  </div>
                )}
              </div>

              {!capturedData && (
                <label className="pp-field">
                  <span>Image URL</span>
                  <div className="pp-input-wrap">
                    <Link2 className="pp-input-icon" size={16} />
                    <input
                      name="photoUrl"
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      value={form.photoUrl}
                      onChange={handleChange}
                    />
                  </div>
                </label>
              )}

              <div className="pp-form-row">
                <label className="pp-field">
                  <span>Photo Type</span>
                  <div className="pp-input-wrap">
                    <Tag className="pp-input-icon" size={16} />
                    <select name="photoType" value={form.photoType} onChange={handleChange}>
                      {PHOTO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </label>
                <label className="pp-field">
                  <span>Body Weight (kg)</span>
                  <div className="pp-input-wrap">
                    <Scale className="pp-input-icon" size={16} />
                    <input name="bodyWeight" type="number" step="0.1" placeholder="Optional" value={form.bodyWeight} onChange={handleChange} />
                  </div>
                </label>
              </div>

              <label className="pp-field">
                <span>Notes</span>
                <div className="pp-input-wrap pp-textarea-wrap">
                  <FileText className="pp-input-icon" size={16} />
                  <textarea name="notes" rows="3" placeholder="Optional notes..." value={form.notes} onChange={handleChange} />
                </div>
              </label>

              <button type="submit" className="pp-submit-btn" disabled={!capturedData && !form.photoUrl}>
                <Upload className="pp-btn-icon" /> Save Photo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="pp-overlay pp-lightbox-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) { setLightbox(null); setConfirmDelete(null) }
        }}>
          <div className="pp-lightbox">
            <button className="pp-lightbox-close" onClick={() => { setLightbox(null); setConfirmDelete(null) }}>
              <X />
            </button>
            <div className="pp-lightbox-content">
              <div className="pp-lightbox-img-wrap">
                <img loading="lazy" src={selectedPhoto.photoUrl} alt={`Progress ${selectedPhoto.photoType}`} className="pp-lightbox-img" />
              </div>
              <div className="pp-lightbox-info">
                <span className={'pp-badge pp-badge-' + selectedPhoto.photoType?.toLowerCase()}>
                  {selectedPhoto.photoType || 'Photo'}
                </span>
                <div className="pp-lightbox-meta">
                  <Calendar className="pp-meta-icon" />
                  <span>{formatDate(selectedPhoto.takenAt)}</span>
                </div>
                {selectedPhoto.bodyWeight != null && (
                  <div className="pp-lightbox-meta">
                    <Weight className="pp-meta-icon" />
                    <span>{selectedPhoto.bodyWeight} kg</span>
                  </div>
                )}
                {selectedPhoto.notes && (
                  <p className="pp-lightbox-notes">{selectedPhoto.notes}</p>
                )}
                {confirmDelete === selectedPhoto.id ? (
                  <div className="pp-confirm-delete">
                    <span>Delete this photo?</span>
                    <div className="pp-confirm-actions">
                      <button className="pp-confirm-yes" onClick={() => handleDelete(selectedPhoto.id)}>Yes, delete</button>
                      <button className="pp-confirm-no" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="pp-delete-btn" onClick={() => setConfirmDelete(selectedPhoto.id)}>
                    <Trash2 className="pp-btn-icon" /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
