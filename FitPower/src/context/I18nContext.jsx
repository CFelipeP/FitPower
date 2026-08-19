import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import translations from '../lib/translations'

const I18nContext = createContext()

const ENGLISH_LANG = 'en'

export function I18nProvider({ children }) {
    const [lang] = useState(ENGLISH_LANG)

    useEffect(() => {
        document.documentElement.lang = ENGLISH_LANG
        try { localStorage.setItem('fitpower_lang', ENGLISH_LANG) } catch { /* storage unavailable */ }
    }, [])

    const setLang = useCallback(() => {}, [])

    const t = useCallback((key, params = {}) => {
        const keys = key.split('.')
        let val = translations[ENGLISH_LANG]
        for (const k of keys) {
            val = val?.[k]
        }
        if (typeof val === 'string' && Object.keys(params).length > 0) {
            return val.replace(/\{(\w+)\}/g, (_, paramName) => params[paramName] ?? `{${paramName}}`)
        }
        return val ?? key
    }, [])

    const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
    const ctx = useContext(I18nContext)
    if (!ctx) return { lang: 'en', setLang: () => {}, t: (k) => k }
    return ctx
}