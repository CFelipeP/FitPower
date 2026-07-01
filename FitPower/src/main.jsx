import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import './styles/globals.css'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  })
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {})
}

// Request notification permission (only if not yet decided)
if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(() => {
        Notification.requestPermission().catch(() => {})
    }, 30000) // Ask after 30 seconds
}

// Firebase Cloud Messaging init (lazy - only if env vars are set)
setTimeout(async () => {
  try {
    const { requestFcmToken } = await import('./lib/firebase')
    await requestFcmToken()
  } catch { /* ignore */ }
}, 15000)

// Online/offline detection
window.addEventListener('online', () => {
    document.body.classList.remove('is-offline')
})

window.addEventListener('offline', () => {
    document.body.classList.add('is-offline')
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
