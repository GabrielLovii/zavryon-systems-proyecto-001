const CACHE = 'zavryon-app-shell-v2';
const APP_SHELL = ['/', '/manifest.webmanifest', '/logo-scpr.jpg'];
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
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (!response.ok) return response;
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('/'))));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => clients[0]?.focus() || self.clients.openWindow('/')));
});
