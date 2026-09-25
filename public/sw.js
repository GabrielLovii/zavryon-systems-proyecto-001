const CACHE = 'zavryon-app-shell-v4';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/logo-scpr.jpg'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    await Promise.all(APP_SHELL.map(async (url) => { try { await cache.add(url); } catch { /* Network unavailable during install. */ } }));
    await self.skipWaiting();
  }));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key.startsWith('zavryon-app-shell-')).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Only same-origin app assets: never cache API responses or third-party calls (e.g. Supabase).
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
    }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => clients[0]?.focus() || self.clients.openWindow('/')));
});
