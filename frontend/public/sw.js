/* Service Worker: atiende Web Push aunque React esté cerrado. */
/* No cacheamos respuestas de la API, sesiones, proyectos ni tareas privadas. */
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Chrome usa la presencia de un manejador fetch para considerar el diálogo PWA.
// Todas las respuestas siguen llegando de la red; NO se guardan en caché.
// Se excluye /api para evitar interceptar sesiones, tareas y datos privados.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_error) { data = {}; }
  const title = String(data.title || 'Kanban 🌸').slice(0, 100);
  const options = {
    body: String(data.body || 'Tienes novedades en tu Kanban.').slice(0, 230),
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    tag: String(data.tag || 'kanban-aviso').slice(0, 120),
    data: { url: typeof data.url === 'string' ? data.url : '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  // Nunca permitir que un enlace de una notificación abra dominios externos.
  const resolved = new URL(target, self.location.origin);
  const url = resolved.origin === self.location.origin ? resolved.href : `${self.location.origin}/`;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'navigate' in client) {
        try {
          await client.navigate(url);
          if ('focus' in client) return client.focus();
        } catch (_error) { /* Si no se puede reutilizar, abrir otra ventana. */ }
      }
    }
    return self.clients.openWindow(url);
  })());
});
