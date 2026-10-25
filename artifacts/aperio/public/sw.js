// APERIO 2.0 — Offline-First Disaster Intelligence Service Worker
const CACHE_NAME = 'aperio-offline-v3';

// Core app shell and baseline disaster intelligence imagery precached during install
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo.svg',
  '/robots.txt',
  '/motion-flood.jpg',
  '/motion-landslide.jpg',
  '/motion-wildfire.jpg',
  '/motion-deforestation.jpg',
  '/motion-satellite.jpg',
  // Verified scenario satellite imagery
  '/satellite_imagery/wayanad_landslide/pre_event.png',
  '/satellite_imagery/wayanad_landslide/post_event.png',
  '/satellite_imagery/assam_flood/pre_event.png',
  '/satellite_imagery/assam_flood/post_event.png',
  '/satellite_imagery/uttarakhand_wildfire/pre_event.png',
  '/satellite_imagery/uttarakhand_wildfire/post_event.png',
  '/satellite_imagery/deforestation/pre_event.png',
  '/satellite_imagery/deforestation/post_event.png'
];

// Installation: Precache assets safely using Promise.allSettled to prevent single-failure aborts
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[APERIO SW] Precaching core assets and verified satellite imagery');
      const cachePromises = CORE_ASSETS.map(async (assetUrl) => {
        try {
          const res = await fetch(assetUrl, { cache: 'no-cache' });
          if (res && res.status === 200) {
            await cache.put(assetUrl, res.clone());
            // Also store under clean path for resilient offline matching
            const parsed = new URL(assetUrl, self.location.origin);
            await cache.put(parsed.pathname, res);
          }
        } catch (err) {
          console.warn('[APERIO SW] Asset precache skipped for:', assetUrl, err?.message);
        }
      });
      await Promise.allSettled(cachePromises);
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

// Inter-process messaging to cache active scenario imagery on demand
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_SCENARIO_IMAGERY' && Array.isArray(event.data.urls)) {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        for (const urlStr of event.data.urls) {
          if (!urlStr) continue;
          try {
            const match = await cache.match(urlStr);
            if (!match) {
              const res = await fetch(urlStr);
              if (res && res.status === 200) {
                await cache.put(urlStr, res.clone());
                const parsed = new URL(urlStr, self.location.origin);
                await cache.put(parsed.pathname, res);
                console.log('[APERIO SW] Dynamically cached scenario satellite image:', urlStr);
              }
            }
          } catch (e) {
            console.warn('[APERIO SW] Dynamic image caching skipped for:', urlStr);
          }
        }
      })
    );
  }
});

// Fetch interception strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 1. Navigation requests -> Network-first with cache fallback to /index.html
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

  // 2. Bypass Service Worker entirely for health checks
  if (url.pathname === '/api/health' || url.pathname.endsWith('/health')) {
    return;
  }

  // 3. Image & Satellite Imagery requests (PRIORITY: Handled BEFORE API 503 handler)
  // Guarantees satellite imagery hosted on either backend or frontend is cached and served offline
  const isImageRequest =
    request.destination === 'image' ||
    url.pathname.includes('/satellite_imagery/') ||
    /\.(png|jpe?g|webp|svg|gif|ico|avif)(\?.*)?$/i.test(url.pathname);

  if (isImageRequest) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // 1. Check cache by exact request
        let cached = await cache.match(request);
        // 2. If not found, check cache by clean pathname
        if (!cached) {
          cached = await cache.match(url.pathname);
        }

        // If offline and cached, return immediately
        if (cached && (typeof navigator !== 'undefined' && !navigator.onLine)) {
          return cached;
        }

        // Attempt network fetch
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const clone = networkResponse.clone();
            cache.put(request, clone);
            cache.put(url.pathname, networkResponse.clone());
          }
          return networkResponse;
        } catch (fetchErr) {
          // Network failed (offline mode)
          if (cached) {
            console.log('[APERIO SW] Serving cached imagery offline for:', url.pathname);
            return cached;
          }
          console.warn('[APERIO SW] Imagery not cached offline for:', url.pathname);
          return new Response('Satellite imagery not yet cached for offline use.', {
            status: 404,
            statusText: 'Not Found (Offline Uncached)',
            headers: { 'Content-Type': 'text/plain', 'X-APERIO-Offline': 'uncached' }
          });
        }
      })()
    );
    return;
  }

  // 4. API requests (both local port 8000 and production cloud backend)
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

  // 5. Static Assets (JS, CSS, SVGs, Fonts)
  if (
    url.origin === self.location.origin ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then(async (cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background if online
          if (navigator.onLine) {
            fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            }).catch(() => {});
          }
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        } catch {
          return new Response('Asset unavailable offline', { status: 404 });
        }
      })
    );
  }
});
