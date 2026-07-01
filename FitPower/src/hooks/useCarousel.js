import { useState, useEffect, useRef, useCallback } from 'react'

export function useCarousel(totalSlides, autoplayMs = 5000) {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const [progress, setProgress] = useState(0)
    const progressTimerRef = useRef(null)

    const goToSlide = useCallback((index) => {
        setCurrentSlide(((index % totalSlides) + totalSlides) % totalSlides)
        setProgress(0)
    }, [totalSlides])

    const nextSlide = useCallback(() => {
        goToSlide(currentSlide + 1)
    }, [currentSlide, goToSlide])

    const prevSlide = useCallback(() => {
        goToSlide(currentSlide - 1)
    }, [currentSlide, goToSlide])

    // Autoplay
    useEffect(() => {
        if (isPaused) return

        const stepMs = 50
        const steps = autoplayMs / stepMs
        let step = 0

        progressTimerRef.current = setInterval(() => {
            step++
            setProgress((step / steps) * 100)

            if (step >= steps) {
                nextSlide()
            }
        }, stepMs)

        return () => {
            clearInterval(progressTimerRef.current)
        }
    }, [isPaused, currentSlide, autoplayMs, nextSlide])

    const pause = () => setIsPaused(true)
    const resume = () => setIsPaused(false)

    // Touch handlers
    const touchStartX = useRef(0)

    const handleTouchStart = (e) => {
        touchStartX.current = e.changedTouches[0].screenX
    }

    const handleTouchEnd = (e) => {
        const touchEndX = e.changedTouches[0].screenX
        const diff = touchStartX.current - touchEndX

        if (Math.abs(diff) > 50) {
            if (diff > 0) nextSlide()
            else prevSlide()
        }
    }

    return {
        currentSlide,
        progress,
        goToSlide,
        nextSlide,
        prevSlide,
        pause,
        resume,
        handleTouchStart,
        handleTouchEnd,
    }
}