/**
 * Service worker for the mat-room iPad: the whole site is precached at
 * install, so practice pages open with the wifi dead.
 *
 * Pages (navigations) are network-first with a short timeout — content
 * changes daily in season, and a coach with signal should never see
 * yesterday's page. Assets are stale-while-revalidate (they're hashed, so
 * stale is safe). Each deploy ships a new precache list (the placeholders
 * below are filled by the build hook in astro.config.mjs), which installs a
 * new worker and drops the old cache.
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

  if (request.mode === 'navigate') {
    // network-first: fresh page when there's signal, saved page when not
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const fresh = await Promise.race([
            fetch(request),
            new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), 3500)),
          ]);
          if (fresh.ok) cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await cache.match(request, { ignoreSearch: true });
          if (cached) return cached;
          const offline = await cache.match(OFFLINE_URL);
          return offline ?? new Response('offline', { status: 503, statusText: 'offline' });
        }
      })
    );
    return;
  }

  // assets are content-hashed — serve from cache, refresh in the background
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);

      if (cached) {
        network.catch(() => {});
        return cached;
      }
      const response = await network;
      return response ?? new Response('offline', { status: 503, statusText: 'offline' });
    })
  );
});
