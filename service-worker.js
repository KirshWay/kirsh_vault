const BUILD_REVISION = "a279664d5d3d23c1faf2";
const PRECACHE_URLS = ["/kirsh_vault/404.html","/kirsh_vault/__next.__PAGE__.txt","/kirsh_vault/__next._full.txt","/kirsh_vault/__next._tree.txt","/kirsh_vault/_next/static/chunks/022-aw5wth50l.css","/kirsh_vault/_next/static/chunks/0cbbqz79fjgmz.js","/kirsh_vault/_next/static/chunks/0cz1d0mv5g_q7.js","/kirsh_vault/_next/static/chunks/11jq0c2_zavac.js","/kirsh_vault/_next/static/chunks/1_d-0yy5os2vi.css","/kirsh_vault/_next/static/chunks/1enx3rmr619kf.js","/kirsh_vault/_next/static/chunks/1eyl7fzkmnkf_.js","/kirsh_vault/_next/static/chunks/1idciydgy2g1w.js","/kirsh_vault/_next/static/chunks/2ao3zh1ruy7yg.js","/kirsh_vault/_next/static/chunks/2dpnum2f6cznk.js","/kirsh_vault/_next/static/chunks/2namdm4ioxosq.js","/kirsh_vault/_next/static/chunks/2uwmr-1d-6htg.js","/kirsh_vault/_next/static/chunks/32re3i153lai8.js","/kirsh_vault/_next/static/chunks/38z-ibcnz6y6g.js","/kirsh_vault/_next/static/chunks/3a11brqhchwef.js","/kirsh_vault/_next/static/chunks/3jajaxnj1_k6z.js","/kirsh_vault/_next/static/chunks/3kmozkq6tgqnz.js","/kirsh_vault/_next/static/chunks/3yfl9fgvivx3-.js","/kirsh_vault/_next/static/chunks/407sthecfve-u.js","/kirsh_vault/_next/static/chunks/turbopack-0wks2uo7bc2io.js","/kirsh_vault/_next/static/chunks/turbopack-2o94p6q4nyes5.js","/kirsh_vault/_next/static/chunks/turbopack-worker-2ru9m5gbh1na6.js","/kirsh_vault/_next/static/media/backup.worker.0swc--_u0-cj-.ts","/kirsh_vault/_next/static/o8H5s7n66jzelYaCdF1aw/_buildManifest.js","/kirsh_vault/_next/static/o8H5s7n66jzelYaCdF1aw/_clientMiddlewareManifest.js","/kirsh_vault/_next/static/o8H5s7n66jzelYaCdF1aw/_ssgManifest.js","/kirsh_vault/_not-found.html","/kirsh_vault/_not-found.txt","/kirsh_vault/_not-found/__next._full.txt","/kirsh_vault/_not-found/__next._not-found.__PAGE__.txt","/kirsh_vault/_not-found/__next._tree.txt","/kirsh_vault/android-chrome-192x192.png","/kirsh_vault/android-chrome-512x512.png","/kirsh_vault/apple-touch-icon-120x120.png","/kirsh_vault/apple-touch-icon-152x152.png","/kirsh_vault/apple-touch-icon-167x167.png","/kirsh_vault/apple-touch-icon.png","/kirsh_vault/books.html","/kirsh_vault/books.txt","/kirsh_vault/books/__next._full.txt","/kirsh_vault/books/__next._tree.txt","/kirsh_vault/books/__next.books.__PAGE__.txt","/kirsh_vault/cinema.html","/kirsh_vault/cinema.txt","/kirsh_vault/cinema/__next._full.txt","/kirsh_vault/cinema/__next._tree.txt","/kirsh_vault/cinema/__next.cinema.__PAGE__.txt","/kirsh_vault/favicon-16x16.png","/kirsh_vault/favicon-32x32.png","/kirsh_vault/favicon.ico","/kirsh_vault/index.html","/kirsh_vault/index.txt","/kirsh_vault/manifest.json","/kirsh_vault/mstile-150x150.png","/kirsh_vault/other.html","/kirsh_vault/other.txt","/kirsh_vault/other/__next._full.txt","/kirsh_vault/other/__next._tree.txt","/kirsh_vault/other/__next.other.__PAGE__.txt","/kirsh_vault/safari-pinned-tab.svg"];
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
