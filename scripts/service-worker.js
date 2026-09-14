/* global self, caches, PRECACHE_URLS, BUILD_REVISION */
const scope = new URL(self.registration.scope);
const cachePrefix = `kirsh-vault:${encodeURIComponent(scope.href)}:`;
const cacheName = `${cachePrefix}${BUILD_REVISION}`;
const assets = new Set(PRECACHE_URLS.map((path) => new URL(path, scope).href));

self.addEventListener('install', (event) => {
  // A failed download rejects installation; open tabs keep their current release.
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) =>
        cache.addAll([...assets].map((url) => new Request(url, { cache: 'reload' })))
      )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              (name.startsWith(cachePrefix) && name !== cacheName) ||
              (scope.pathname === '/kirsh_vault/' && name === 'kirsh-vault-cache-v1')
          )
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname) ||
    (request.method !== 'GET' && request.method !== 'HEAD')
  )
    return;

  url.search = '';
  url.hash = '';
  let asset = url.href;
  if (!assets.has(asset)) {
    // Static export exposes /books.html as /books and /books/ on the host.
    const route = url.pathname.replace(/\/$/, '');
    asset =
      url.pathname === scope.pathname
        ? new URL('index.html', scope).href
        : new URL(`${route}.html`, scope).href;
  }
  if (!assets.has(asset)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      const response = await cache.match(asset);
      if (!response) {
        // Never substitute HTML for a missing script or a Next.js navigation payload.
        return new Response('Offline resource unavailable', { status: 503 });
      }
      // A cached network response carries its canonical URL. Construct a response without
      // that URL so worker.location retains request parameters used by the bundler bootstrap.
      return new Response(request.method === 'HEAD' ? null : response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    })()
  );
});
