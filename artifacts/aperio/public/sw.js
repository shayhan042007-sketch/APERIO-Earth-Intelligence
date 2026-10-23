// APERIO 2.0 — Offline-First Disaster Intelligence Service Worker
const CACHE_NAME = 'aperio-offline-v2';

// Critical app shell files precached during install
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo.svg',
  '/robots.txt'
];

// Installation: Cache essential app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[APERIO SW] Precaching app shell assets');
      try {
        await cache.addAll(APP_SHELL);
      } catch (err) {
        console.warn('[APERIO SW] Initial addAll partial notice:', err);
      }
    }).then(() => self.skipWaiting())
  );
});

// Activation: Clean up stale caches & take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[APERIO SW] Purging obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch interception strategy:
// 1. Navigation requests -> Network-first with cache fallback to /index.html
// 2. Health check requests -> Bypass SW completely to test true network reachability
// 3. API requests -> Network-first; if offline, return structured 503 response
// 4. Static bundles/assets (.js, .css, images, fonts) -> Cache-first with network revalidation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests for caching
  if (request.method !== 'GET') {
    return;
  }

  // Handle SPA Navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log('[APERIO SW] Offline navigation detected; serving cached app shell');
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('/index.html') || await cache.match('/');
          if (cachedIndex) {
            return cachedIndex;
          }
          return new Response('APERIO Offline Shell Loading...', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // 1. Bypass Service Worker entirely for health checks
  // Guarantees direct network reachability test without interception, caching, or synthetic fallback
  if (url.pathname === '/api/health' || url.pathname.endsWith('/health')) {
    return;
  }

  // 2. Handle API requests (both local port 8000 and production cloud backend)
  if (url.pathname.startsWith('/api') || url.hostname.includes('onrender.com') || url.port === '8000') {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => {
          console.warn('[APERIO SW] API offline fallback for:', url.pathname);
          return new Response(
            JSON.stringify({
              offline: true,
              error: 'Offline Mode: Backend service unreachable',
              endpoint: url.pathname
            }),
            {
              status: 503,
              statusText: 'Service Unavailable (Offline)',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // 3. Handle Static Assets (JS, CSS, SVGs, Images, Fonts)
  if (
    url.origin === self.location.origin ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Fetch fresh copy in background to revalidate
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        // Return cached immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
    );
  }
});
