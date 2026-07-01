import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [initialized, setInitialized] = useState(false)
    const [token, setToken] = useState(localStorage.getItem('token'))

    const saveToken = useCallback((newToken, newRefreshToken) => {
        if (newToken) {
            localStorage.setItem('token', newToken)
        } else {
            localStorage.removeItem('token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('role')
        }
        if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken)
        } else if (!newToken) {
            localStorage.removeItem('refresh_token')
        }
        setToken(newToken)
    }, [])

    useEffect(() => {
        let cancelled = false

        const init = token
            ? apiFetch('/auth/me').then(d => ({ data: d, error: null }), err => ({ data: null, error: err }))
            : Promise.resolve({ data: null, error: new Error('no token') })

        init.then(({ data, error }) => {
            if (cancelled) return
            if (error || !data) {
                if (token) saveToken(null)
                setUser(null)
            } else {
                setUser(data)
                localStorage.setItem('role', data.role)
            }
            setLoading(false)
            setInitialized(true)
        })

        return () => { cancelled = true }
    }, [token, saveToken])

    const login = useCallback(async (email, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!data.success) {
            throw new Error(data.message || 'Invalid credentials')
        }
        saveToken(data.data.token, data.data.refresh_token)
        setUser(data.data.user)
        localStorage.setItem('role', data.data.user.role)
        if (data.data.csrf_token) {
            localStorage.setItem('csrf_token', data.data.csrf_token)
        }
        return data.data.user
    }, [saveToken])

    const register = useCallback(async (formData) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        })
        const data = await res.json()
        if (!data.success) {
            throw new Error(data.message || 'Error registering')
        }
        saveToken(data.data.token, data.data.refresh_token)
        setUser(data.data.user)
        localStorage.setItem('role', data.data.user.role)
        if (data.data.csrf_token) {
            localStorage.setItem('csrf_token', data.data.csrf_token)
        }
        return data.data.user
    }, [saveToken])

    const logout = useCallback(() => {
        saveToken(null)
        setUser(null)
    }, [saveToken])

    const googleLogin = useCallback(async (credential) => {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.message || 'Google login failed')
        saveToken(data.data.token, data.data.refresh_token)
        setUser(data.data.user)
        localStorage.setItem('role', data.data.user.role)
        if (data.data.csrf_token) localStorage.setItem('csrf_token', data.data.csrf_token)
        return { user: data.data.user, needsPasswordSetup: data.data.needsPasswordSetup }
    }, [saveToken])

    const isAuthenticated = !!token && !!user
    const role = user?.role || localStorage.getItem('role')

    return (
        <AuthContext.Provider value={{ user, token, loading, login, googleLogin, register, logout, isAuthenticated, role, initialized }}>
            {children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
