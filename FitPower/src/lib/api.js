const API_BASE = '/api'

let refreshPromise = null

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return null

    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        })
        const data = await res.json()
        if (data.success && data.data?.token) {
            localStorage.setItem('token', data.data.token)
            if (data.data.refresh_token) {
                localStorage.setItem('refresh_token', data.data.refresh_token)
            }
            if (data.data.user?.role) {
                localStorage.setItem('role', data.data.user.role)
            }
            if (data.data.csrf_token) {
                localStorage.setItem('csrf_token', data.data.csrf_token)
                localStorage.setItem('csrf_token_at', Date.now().toString())
            }
            return data.data.token
        }
        return null
    } catch {
        return null
    }
}

const CSRF_REFRESH_MS = 10 * 60 * 1000 // 10 min

async function getCsrfToken() {
    const stored = localStorage.getItem('csrf_token')
    const storedAt = localStorage.getItem('csrf_token_at')
    if (stored && storedAt && Date.now() - Number(storedAt) < CSRF_REFRESH_MS) {
        return stored
    }

    try {
        const res = await fetch(`${API_BASE}/csrf-token`)
        const data = await res.json()
        if (data.success && data.data?.csrf_token) {
            localStorage.setItem('csrf_token', data.data.csrf_token)
            localStorage.setItem('csrf_token_at', Date.now().toString())
            return data.data.csrf_token
        }
    } catch { /* ignore */ }
    return null
}

export async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token')
    const headers = { 'Content-Type': 'application/json', ...options.headers }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const method = (options.method || 'GET').toUpperCase()
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
    if (mutatingMethods.includes(method)) {
        const csrfToken = await getCsrfToken()
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken
    }

    let res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
    const data = await res.json()

    if (data.data?.csrf_token) {
        localStorage.setItem('csrf_token', data.data.csrf_token)
        localStorage.setItem('csrf_token_at', Date.now().toString())
    }

    if (!data.success && res.status === 401 && token && !endpoint.includes('/auth/refresh')) {
        if (!refreshPromise) {
            refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null })
        }
        const newToken = await refreshPromise
        if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`
            const csrfToken = await getCsrfToken()
            if (csrfToken) headers['X-CSRF-Token'] = csrfToken
            res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
            const retryData = await res.json()
            if (retryData.data?.csrf_token) {
                localStorage.setItem('csrf_token', retryData.data.csrf_token)
                localStorage.setItem('csrf_token_at', Date.now().toString())
            }
            if (retryData.success) return retryData.data
        }
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('role')
        throw new Error(data.message || 'API Error')
    }

    // CSRF token expired — fetch a fresh one and retry once
    if (!data.success && res.status === 403 && !endpoint.includes('/auth/') && !endpoint.includes('/csrf-token')) {
        localStorage.removeItem('csrf_token')
        localStorage.removeItem('csrf_token_at')
        const freshToken = await getCsrfToken()
        if (freshToken) {
            headers['X-CSRF-Token'] = freshToken
            res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
            const retryData = await res.json()
            if (retryData.data?.csrf_token) {
                localStorage.setItem('csrf_token', retryData.data.csrf_token)
                localStorage.setItem('csrf_token_at', Date.now().toString())
            }
            if (retryData.success) return retryData.data
        }
    }

    if (!data.success) {
        throw new Error(data.message || 'API Error')
    }
    return data.data
}
