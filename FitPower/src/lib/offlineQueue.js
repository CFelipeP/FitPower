// Offline-safe workout persistence:
// - workout snapshot saved to localStorage so an interrupted session can resume
// - pending mutations queued locally and flushed when the network returns

const SNAPSHOT_KEY = 'fp_active_workout'
const QUEUE_KEY = 'fp_offline_queue'

export function saveWorkoutSnapshot(snapshot) {
    try {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
    } catch { /* storage full or unavailable */ }
}

export function getWorkoutSnapshot() {
    try {
        const raw = localStorage.getItem(SNAPSHOT_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function clearWorkoutSnapshot() {
    try {
        localStorage.removeItem(SNAPSHOT_KEY)
    } catch { /* ignore */ }
}

export function isOnline() {
    return typeof navigator === 'undefined' ? true : navigator.onLine
}

export function getQueue() {
    try {
        const raw = localStorage.getItem(QUEUE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function setQueue(queue) {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    } catch { /* ignore */ }
}

export function enqueueOp(op) {
    const queue = getQueue()
    const id = op.opId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    queue.push({ id, method: op.method || 'POST', endpoint: op.endpoint, body: op.body || null, ts: Date.now() })
    setQueue(queue)
    return id
}

function removeOp(id) {
    setQueue(getQueue().filter(op => op.id !== id))
}

let flushing = false

/**
 * Flush pending operations in order. Stops at the first failure so ordering
 * and consistency are preserved (the queue retries on the next flush).
 * Returns the number of ops flushed.
 */
export async function flushQueue(apiFetch) {
    if (flushing || !isOnline()) return 0
    flushing = true
    let flushed = 0
    try {
        const queue = getQueue()
        for (const op of queue) {
            try {
                await apiFetch(op.endpoint, { method: op.method, body: op.body ? JSON.parse(JSON.stringify(op.body)) : undefined })
                removeOp(op.id)
                flushed++
            } catch {
                break
            }
        }
    } finally {
        flushing = false
    }
    return flushed
}

let listenersInstalled = false

/**
 * Auto-flush on reconnection and on an interval while online.
 * Pass the apiFetch function from src/lib/api.
 */
export function installOfflineSync(apiFetch, { intervalMs = 30000, onSynced } = {}) {
    if (listenersInstalled || typeof window === 'undefined') return
    listenersInstalled = true

    const tryFlush = () => {
        flushQueue(apiFetch).then(flushed => {
            if (flushed > 0 && typeof onSynced === 'function') onSynced(flushed)
        })
    }

    window.addEventListener('online', tryFlush)
    setInterval(() => {
        if (isOnline() && getQueue().length > 0) tryFlush()
    }, intervalMs)
}
