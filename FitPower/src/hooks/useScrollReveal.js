import { useEffect, useRef } from 'react'

export function useScrollReveal() {
    const ref = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active')
                    }
                })
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        )

        const elements = ref.current?.querySelectorAll(
            '.reveal, .reveal-left, .reveal-right, .reveal-scale'
        )

        elements?.forEach((el) => observer.observe(el))

        return () => observer.disconnect()
    }, [])

    return ref
}