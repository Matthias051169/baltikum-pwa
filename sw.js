const CACHE_NAME = 'baltikum-pwa-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first fuer alle Requests, damit Freigabe-Daten immer aktuell sind.
// Fallback auf Cache nur fuer die App-Shell selbst (offline).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAppShell = ASSETS.some((a) => url.pathname.endsWith(a.replace('./', '')));

  if (isAppShell) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
  // Alle anderen Requests (n8n-API-Aufrufe) unangetastet durchlassen.
});
