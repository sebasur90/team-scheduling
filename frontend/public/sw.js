// Service Worker para notificaciones push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Turno de almuerzo';
  const options = {
    body: data.body || 'Tienes una notificación',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'turno-notif',
    data: data.data || {},
    actions: [
      {
        action: 'accept',
        title: 'Sí, salgo',
      },
      {
        action: 'reject',
        title: 'No puedo',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  if (action === 'accept') {
    fetch('/api/notificaciones/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notif_id: notificationData.notif_id,
        respuesta: 'si',
      }),
    }).catch(console.error);
  } else if (action === 'reject') {
    fetch('/api/notificaciones/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notif_id: notificationData.notif_id,
        respuesta: 'no',
      }),
    }).catch(console.error);
  }

  // Abrir ventana de la app
  clients.matchAll({ type: 'window' }).then((clientList) => {
    for (const client of clientList) {
      if (client.url === '/' && 'focus' in client) {
        return client.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow('/');
    }
  });
});

self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  event.waitUntil(clients.claim());
});
