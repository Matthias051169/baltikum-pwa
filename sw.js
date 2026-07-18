// Baltikum PWA – Service Worker
// Cached nur die App-Huelle (HTML/Manifest/Icons), damit die App auch bei
// schwachem Netz startet. API-Aufrufe an n8n.taila03b27.ts.net werden NIE
// aus dem Cache bedient, da Freigaben-/Statistikdaten immer aktuell sein
// muessen.

const CACHE_NAME = "baltikum-pwa-shell-v3";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API-Calls: immer Netzwerk, nie Cache.
  if (url.hostname.endsWith("taila03b27.ts.net")) {
    return;
  }

  // App-Huelle: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
