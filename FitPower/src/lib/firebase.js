import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { apiFetch } from './api'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

let app = null
let messaging = null
let fcmToken = null

export function initFirebase() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('[FCM] Firebase not configured — skipping')
    return null
  }
  if (!app) {
    app = initializeApp(firebaseConfig)
    messaging = getMessaging(app)
  }
  return { app, messaging }
}

export async function requestFcmToken() {
  if (!('Notification' in window) || Notification.permission === 'denied') return null
  if (fcmToken) return fcmToken

  try {
    const fb = initFirebase()
    if (!fb) return null

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    // Send config to SW for background messages
    if (swRegistration.active) {
      swRegistration.active.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig })
    }
    fcmToken = await getToken(fb.messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || '',
      serviceWorkerRegistration: swRegistration,
    })

    if (fcmToken) {
      await apiFetch('/auth/fcm-token', {
        method: 'POST',
        body: JSON.stringify({ fcm_token: fcmToken }),
      })
    }

    return fcmToken
  } catch (err) {
    console.warn('[FCM] Token request failed:', err.message)
    return null
  }
}

export function onForegroundMessage(callback) {
  try {
    const fb = initFirebase()
    if (!fb) return () => {}
    const unsubscribe = onMessage(fb.messaging, (payload) => {
      callback(payload)
    })
    return unsubscribe
  } catch {
    return () => {}
  }
}
