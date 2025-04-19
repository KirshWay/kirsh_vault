const CACHE_NAME = 'kirsh-vault-cache-v1';

const urlsToCache = [
  '/kirsh_vault/',
  '/kirsh_vault/manifest.json',
  '/kirsh_vault/favicon.ico',
  '/kirsh_vault/android-chrome-192x192.png',
  '/kirsh_vault/android-chrome-512x512.png',
  '/kirsh_vault/apple-touch-icon.png',
  '/kirsh_vault/favicon-16x16.png',
  '/kirsh_vault/favicon-32x32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/kirsh_vault/');
          }
        });
    })
  );
});
