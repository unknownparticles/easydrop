const CACHE_NAME = 'localdrop-shell-v3';
const scopeUrl = new URL(self.registration.scope);
const SHELL = ['offline.html', 'manifest.webmanifest', 'icon.png'].map((file) => new URL(file, scopeUrl).pathname);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(new URL('offline.html', scopeUrl).pathname))
    );
    return;
  }
});
