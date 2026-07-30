/**
 * Service worker for the mat-room iPad: the whole site is precached at
 * install, so practice pages open with the wifi dead. Serving is
 * stale-while-revalidate — instant from cache, refreshed in the background —
 * and each deploy ships a new precache list (the placeholders below are
 * filled by the build hook in astro.config.mjs), which installs a new worker
 * and drops the old cache.
 */
const CACHE = '__CACHE_NAME__';
const PRECACHE = __PRECACHE_MANIFEST__;
// scope-relative so the same worker serves at a domain root or a subpath
const OFFLINE_URL = new URL('offline/', self.registration.scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);

      if (cached) {
        network.catch(() => {}); // refresh in background, result unused
        return cached;
      }
      const response = await network;
      if (response) return response;
      if (request.mode === 'navigate') {
        const offline = await cache.match(OFFLINE_URL);
        if (offline) return offline;
      }
      return new Response('offline', { status: 503, statusText: 'offline' });
    })
  );
});
