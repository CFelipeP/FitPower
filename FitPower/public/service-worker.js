const CACHE = 'fitpower-v3'
const STATIC_CACHE = 'fitpower-static-v3'
const FONT_CACHE = 'fitpower-fonts-v3'
const API_CACHE = 'fitpower-api-v3'
const DYNAMIC_CACHE = 'fitpower-dynamic-v3'

const PRECACHE_URLS = [
    '/',
    '/offline.html',
    '/manifest.json',
    '/favicon.svg',
]

const STATIC_EXTENSIONS = /\.(css|js|mjs|jsx|ts|tsx)$/
const FONT_EXTENSIONS = /\.(woff2?|ttf|otf|eot)$/
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|webp|avif|ico)$/
const API_PATTERN = /^\/api\//

// Install: precache core assets
self.addEventListener('install', (event) => {
    self.skipWaiting()
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
    )
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            const keep = new Set([CACHE, STATIC_CACHE, FONT_CACHE, API_CACHE, DYNAMIC_CACHE])
            return Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k)))
        })
    )
    self.clients.claim()
})

// Strategy: Cache First (static assets)
async function cacheFirst(request, cacheName, fallback) {
    const cached = await caches.match(request)
    if (cached) return cached
    try {
        const response = await fetch(request)
        if (response.ok) {
            const cache = await caches.open(cacheName || DYNAMIC_CACHE)
            cache.put(request, response.clone())
        }
        return response
    } catch {
        if (fallback) return caches.match(fallback)
        return new Response('Offline', { status: 503 })
    }
}

// Strategy: Network First (API calls)
async function networkFirst(request) {
    try {
        const response = await fetch(request)
        if (response.ok) {
            const cache = await caches.open(API_CACHE)
            cache.put(request, response.clone())
        }
        return response
    } catch {
        const cached = await caches.match(request)
        if (cached) return cached
        return new Response(JSON.stringify({ offline: true, message: 'You are offline' }), {
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

// Strategy: Stale While Revalidate (HTML pages)
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE)
    const cached = await cache.match(request)
    const fetchPromise = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone())
        return response
    }).catch(() => cached)
    return cached || fetchPromise
}

// IndexedDB for offline routines
const DB_NAME = 'FitPowerOffline'
const DB_VERSION = 1
const ROUTINES_STORE = 'routines'
const EXERCISES_STORE = 'exercises'

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        request.onupgradeneeded = (event) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains(ROUTINES_STORE)) {
                db.createObjectStore(ROUTINES_STORE, { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains(EXERCISES_STORE)) {
                db.createObjectStore(EXERCISES_STORE, { keyPath: 'id' })
            }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

async function saveToDB(storeName, data) {
    try {
        const db = await openDB()
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        if (Array.isArray(data)) {
            data.forEach(item => store.put(item))
        } else {
            store.put(data)
        }
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve
            tx.onerror = reject
        })
    } catch { /* ignore */ }
}

async function getAllFromDB(storeName) {
    try {
        const db = await openDB()
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const result = await new Promise((resolve, reject) => {
            const req = store.getAll()
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => reject(req.error)
        })
        return result
    } catch {
        return []
    }
}

// Message listener: save routines to IndexedDB
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SAVE_ROUTINE') {
        saveToDB(ROUTINES_STORE, event.data.routine)
    }
    if (event.data && event.data.type === 'SAVE_EXERCISES') {
        saveToDB(EXERCISES_STORE, event.data.exercises)
    }
})

// Override networkFirst for routine/exercise API to include offline fallback
async function networkFirstWithRoutineFallback(request) {
    try {
        const response = await fetch(request)
        if (response.ok) {
            const cache = await caches.open(API_CACHE)
            cache.put(request, response.clone())
            const data = await response.clone().json()
            if (request.url.includes('/api/routines/daily')) {
                saveToDB(ROUTINES_STORE, data)
            }
            if (request.url.includes('/api/exercises')) {
                const exercises = Array.isArray(data) ? data : (data.exercises || [])
                saveToDB(EXERCISES_STORE, exercises)
            }
        }
        return response
    } catch {
        const cached = await caches.match(request)
        if (cached) return cached
        if (request.url.includes('/api/routines/daily')) {
            const routines = await getAllFromDB(ROUTINES_STORE)
            return new Response(JSON.stringify(routines.length ? routines : { offline: true, message: 'No saved routines available' }), {
                headers: { 'Content-Type': 'application/json' }
            })
        }
        if (request.url.includes('/api/exercises')) {
            const exercises = await getAllFromDB(EXERCISES_STORE)
            return new Response(JSON.stringify(exercises.length ? { exercises } : { offline: true, message: 'No saved exercises available' }), {
                headers: { 'Content-Type': 'application/json' }
            })
        }
        return new Response(JSON.stringify({ offline: true, message: 'You are offline' }), {
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

// Override the fetch handler for routine/exercise APIs
self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    // Bypass service worker cache in local development so changes are reflected immediately
    const isLocalDev = self.location.hostname === 'localhost' ||
        self.location.hostname === '127.0.0.1' ||
        self.location.hostname.endsWith('.localhost')
    if (isLocalDev) {
        return
    }

    // Skip non-GET and browser extensions
    if (request.method !== 'GET') return
    if (url.protocol === 'chrome-extension:') return

    // Route-specific offline support for routines & exercises
    if (url.pathname === '/api/routines/daily' || url.pathname.startsWith('/api/exercises')) {
        event.respondWith(networkFirstWithRoutineFallback(request))
        return
    }

    // API calls: network first (already handled above for specific routes)
    if (API_PATTERN.test(url.pathname) || url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request))
        return
    }

    // Fonts: cache first
    if (FONT_EXTENSIONS.test(url.pathname)) {
        event.respondWith(cacheFirst(request, FONT_CACHE))
        return
    }

    // Static assets: cache first
    if (STATIC_EXTENSIONS.test(url.pathname)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE))
        return
    }

    // Images: cache first with offline fallback
    if (IMAGE_EXTENSIONS.test(url.pathname)) {
        event.respondWith(cacheFirst(request, DYNAMIC_CACHE))
        return
    }

    // Navigation: stale while revalidate, fallback to offline page
    if (request.mode === 'navigate') {
        event.respondWith(
            staleWhileRevalidate(request).catch(() => caches.match('/offline.html'))
        )
        return
    }

    // Everything else: network first
    event.respondWith(networkFirst(request))
})

// Push notifications (keep existing code)
self.addEventListener('push', (event) => {
    let data
    try {
        data = event.data.json()
    } catch {
        data = { title: 'FitPower', body: event.data.text() || 'New notification' }
    }

    const options = {
        body: data.body || '',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/' },
    }

    event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = event.notification.data?.url || '/'
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) return client.focus()
            }
            if (clients.openWindow) return clients.openWindow(url)
        })
    )
})
