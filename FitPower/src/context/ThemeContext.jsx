import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext()

function getInitialTheme() {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
    return 'dark'
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(getInitialTheme)

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggleTheme = useCallback(() => {
        setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'))
    }, [])

    const setTheme = useCallback((t) => {
        if (t === 'light' || t === 'dark') setThemeState(t)
    }, [])

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext)
