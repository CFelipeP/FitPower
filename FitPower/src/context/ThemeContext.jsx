import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const ThemeContext = createContext()

const DARK_THEME = 'dark'

export function ThemeProvider({ children }) {
    const [theme] = useState(DARK_THEME)

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', DARK_THEME)
        document.documentElement.style.colorScheme = DARK_THEME
        try { localStorage.setItem('theme', DARK_THEME) } catch { /* storage unavailable */ }
    }, [])

    const toggleTheme = useCallback(() => {}, [])
    const setTheme = useCallback(() => {}, [])

    const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme, setTheme])

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext)