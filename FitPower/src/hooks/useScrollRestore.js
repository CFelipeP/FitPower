import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const KEY = 'saved_scroll'

export function useScrollRestore() {
    const { pathname } = useLocation()

    useEffect(() => {
        const saved = sessionStorage.getItem(KEY + pathname)

        function tryRestore() {
            if (!saved) return true
            const target = Number(saved)
            if (document.documentElement.scrollHeight > Math.max(target, window.innerHeight)) {
                window.scrollTo(0, target)
                return true
            }
            return false
        }

        let restoreTimer
        if (saved && !tryRestore()) {
            restoreTimer = setInterval(() => {
                if (tryRestore()) clearInterval(restoreTimer)
            }, 150)
        }

        function save() {
            sessionStorage.setItem(KEY + pathname, String(window.scrollY))
        }

        let saveTimer
        function onScroll() {
            clearTimeout(saveTimer)
            saveTimer = setTimeout(save, 150)
        }

        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('beforeunload', save)

        return () => {
            save()
            clearInterval(restoreTimer)
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('beforeunload', save)
            clearTimeout(saveTimer)
        }
    }, [pathname])
}
