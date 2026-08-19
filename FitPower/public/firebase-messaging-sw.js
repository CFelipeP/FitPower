importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    const config = event.data.config;
    if (!config || !config.apiKey || !config.projectId) return;
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      // When a `notification` payload is present the browser already displays
      // it; only build a display notification from data-only messages.
      if (payload.notification && (payload.notification.title || payload.notification.body)) {
        return;
      }
      const data = payload.data || {};
      const title = data.title || 'FitPower';
      const body = data.body || '';
      const url = data.url || '/';
      self.registration.showNotification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        data: { url },
        vibrate: [200, 100, 200],
      });
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
