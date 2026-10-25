// APERIO 2.0 — Service Worker Registration & Lifecycle Management

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[APERIO SW] Service Worker registered with scope:', registration.scope);

          // Handle updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[APERIO SW] New content available; please refresh to update.');
                  } else {
                    console.log('[APERIO SW] Content is cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('[APERIO SW] Service Worker registration failed:', error);
        });
    });

    // Refresh page when new service worker takes over if needed
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[APERIO SW] Controller changed; new SW active');
    });
  }
}

/**
 * Proactively instructs the active Service Worker to cache satellite imagery URLs
 * for offline availability when a scenario is selected or loaded.
 */
export function cacheScenarioImagery(urls: (string | undefined)[]) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const validUrls = urls.filter((u): u is string => Boolean(u && typeof u === 'string'));
  if (validUrls.length === 0) return;

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_SCENARIO_IMAGERY',
      urls: validUrls
    });
  }
}
