import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './ProgressSlider.css'

export default function ProgressSlider({ beforePhoto, afterPhoto }) {
  const [sliderPos, setSliderPos] = useState(50)
  const containerRef = useRef(null)
  const dragging = useRef(false)

  const handleMouseDown = useCallback(() => { dragging.current = true }, [])
  const handleMouseUp = useCallback(() => { dragging.current = false }, [])

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPos(pct)
  }, [])

  const handleTouchStart = useCallback(() => { dragging.current = true }, [])
  const handleTouchEnd = useCallback(() => { dragging.current = false }, [])
  const handleTouchMove = useCallback((e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.touches[0].clientX - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPos(pct)
  }, [])

  if (!beforePhoto && !afterPhoto) {
    return (
      <div className="ps-empty">
        <p>Select two photos to compare</p>
      </div>
    )
  }

  return (
    <div className="ps-container">
      <div
        className="ps-slider"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {afterPhoto && (
          <div className="ps-image ps-after">
            <img loading="lazy" src={afterPhoto.photoUrl || afterPhoto} alt="After" />
            <span className="ps-label ps-label-after">After</span>
          </div>
        )}
        {beforePhoto && (
          <div
            className="ps-image ps-before"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <img loading="lazy" src={beforePhoto.photoUrl || beforePhoto} alt="Before" />
            <span className="ps-label ps-label-before">Before</span>
          </div>
        )}
        <div
          className="ps-handle"
          style={{ left: `${sliderPos}%` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="ps-handle-line" />
          <div className="ps-handle-knob">
            <ChevronLeft size={18} />
            <ChevronRight size={18} />
          </div>
        </div>
      </div>
    </div>
  )
}
