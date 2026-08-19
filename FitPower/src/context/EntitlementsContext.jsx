import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from './AuthContext'

/**
 * Centralized entitlement state. Backed by GET /entitlements (server is the
 * source of truth — nothing here grants access, it only mirrors the server).
 */
const EntitlementsContext = createContext(null)

export function EntitlementsProvider({ children }) {
    const { isAuthenticated, token } = useAuth()
    const [entitlements, setEntitlements] = useState(null)
    const [loading, setLoading] = useState(false)

    const refresh = useCallback(async () => {
        if (!isAuthenticated) {
            setEntitlements(null)
            return null
        }
        setLoading(true)
        try {
            const data = await apiFetch('/entitlements')
            setEntitlements(data)
            return data
        } catch {
            setEntitlements(null)
            return null
        } finally {
            setLoading(false)
        }
    }, [isAuthenticated])

    useEffect(() => {
        refresh()
    }, [refresh, token])

    const hasFeature = useCallback((feature) => {
        return !!(entitlements && entitlements[feature])
    }, [entitlements])

    const value = useMemo(() => ({
        entitlements,
        loading,
        hasFeature,
        refresh,
    }), [entitlements, loading, hasFeature, refresh])

    return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEntitlements() {
    return useContext(EntitlementsContext)
}
