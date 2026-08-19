// Resolve stored media paths to URLs that work from any SPA route and in
// both dev (Vite proxy) and production (Apache alias /api).
export function mediaUrl(path) {
    if (!path || typeof path !== 'string') return ''
    const p = path.trim()
    if (!p) return ''
    if (/^(https?:|data:|\/\/)/i.test(p)) return p
    if (p.startsWith('/api/')) return p
    if (p.startsWith('/')) return '/api' + p
    return '/api/' + p
}
