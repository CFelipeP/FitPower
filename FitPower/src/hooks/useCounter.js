import { useEffect, useRef, useState } from 'react'

export function useCounter(target, isPercentage = false) {
    const [count, setCount] = useState(0)
    const [hasStarted, setHasStarted] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasStarted) {
                        setHasStarted(true)
                        const duration = 2000
                        const start = performance.now()

                        const update = (now) => {
                            const progress = Math.min((now - start) / duration, 1)
                            const eased = 1 - Math.pow(1 - progress, 3)
                            const current = Math.floor(eased * target)

                            if (target >= 1000) {
                                setCount(progress < 1 ? parseFloat((current / 1000).toFixed(1)) : target / 1000)
                            } else {
                                setCount(current)
                            }

                            if (progress < 1) {
                                requestAnimationFrame(update)
                            }
                        }

                        requestAnimationFrame(update)
                    }
                })
            },
            { threshold: 0.5 }
        )

        if (ref.current) {
            observer.observe(ref.current)
        }

        return () => observer.disconnect()
    }, [target, hasStarted])

    const formatCount = () => {
        if (target >= 1000) {
            return `${count}K+`
        }
        return `${count}${isPercentage ? '%' : '+'}`
    }

    return { count, formatCount, ref }
}