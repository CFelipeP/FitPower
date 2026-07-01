import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import translations from '../lib/translations'
import { apiFetch } from '../lib/api'

const I18nContext = createContext()

const SUPPORTED_LANGS = ['en', 'es']
const FALLBACK_LANG = 'en'
const LANG_KEY = 'fitpower_lang'

function detectBrowserLang() {
    try {
        const lang = navigator.language?.split('-')[0] || FALLBACK_LANG
        return SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG
    } catch {
        return FALLBACK_LANG
    }
}

export function I18nProvider({ children }) {
    const [lang, setLangState] = useState(() => {
        return localStorage.getItem(LANG_KEY) || detectBrowserLang()
    })

    const setLang = useCallback((newLang) => {
        if (!SUPPORTED_LANGS.includes(newLang)) return
        setLangState(newLang)
        localStorage.setItem(LANG_KEY, newLang)
        document.documentElement.lang = newLang

        const token = localStorage.getItem('token')
        if (token) {
            apiFetch('/settings', {
                method: 'PUT',
                body: JSON.stringify({ language: newLang }),
            }).catch(() => {})
        }
    }, [])

    useEffect(() => {
        document.documentElement.lang = lang
    }, [lang])

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) {
            apiFetch('/settings').then(settings => {
                if (settings?.language && SUPPORTED_LANGS.includes(settings.language) && settings.language !== lang) {
                    setLangState(settings.language)
                    localStorage.setItem(LANG_KEY, settings.language)
                    document.documentElement.lang = settings.language
                }
            }).catch(() => {})
        }
    }, [])

    const t = useCallback((key, params = {}) => {
        const keys = key.split('.')
        let val = translations[lang] || translations[FALLBACK_LANG]
        for (const k of keys) {
            val = val?.[k]
        }
        if (val === undefined) {
            val = translations[FALLBACK_LANG]
            for (const k of keys) {
                val = val?.[k]
            }
        }
        if (typeof val === 'string' && Object.keys(params).length > 0) {
            return val.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`)
        }
        return val ?? key
    }, [lang])

    return (
        <I18nContext.Provider value={{ lang, setLang, t }}>
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
