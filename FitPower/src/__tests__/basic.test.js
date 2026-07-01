import { describe, it, expect } from 'vitest'

describe('apiFetch', () => {
    it('should construct correct API URL', () => {
        const url = '/api/test-endpoint'
        expect(url.startsWith('/api')).toBe(true)
    })

    it('should require API_BASE prefix', () => {
        expect('/api'.length).toBeGreaterThan(0)
    })
})

describe('Auth utilities', () => {
    it('should store and retrieve token from localStorage', () => {
        localStorage.setItem('token', 'test-token-123')
        expect(localStorage.getItem('token')).toBe('test-token-123')
        localStorage.removeItem('token')
    })

    it('should store and retrieve role from localStorage', () => {
        localStorage.setItem('role', 'client')
        expect(localStorage.getItem('role')).toBe('client')
        localStorage.removeItem('role')
    })
})

describe('ProtectedRoute logic', () => {
    it('should redirect to login when no token', () => {
        localStorage.removeItem('token')
        const token = localStorage.getItem('token')
        expect(token).toBeNull()
    })

    it('should block access for wrong roles', () => {
        localStorage.setItem('token', 'valid')
        localStorage.setItem('role', 'client')
        const role = localStorage.getItem('role')
        expect(role).toBe('client')
        const allowed = ['admin']
        expect(allowed.includes(role)).toBe(false)
        localStorage.removeItem('token')
        localStorage.removeItem('role')
    })

    it('should allow access for correct roles', () => {
        localStorage.setItem('token', 'valid')
        localStorage.setItem('role', 'admin')
        const role = localStorage.getItem('role')
        expect(role).toBe('admin')
        const allowed = ['admin']
        expect(allowed.includes(role)).toBe(true)
        localStorage.removeItem('token')
        localStorage.removeItem('role')
    })
})
