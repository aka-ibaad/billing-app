// Minimal offline-first service worker.
//
// All app data (invoices, clients, settings, etc.) already lives in
// localStorage — there's no backend API to worry about caching. So the only
// thing offline support needs to handle is the app shell itself: the HTML
// page, JS/CSS bundles, and fonts. Once those are cached, the app works
// fully offline because every read/write already happens against
// localStorage.
//
// Strategy: network-first for navigations (so users always get the latest
// build when online, with a cached fallback when they don't), cache-first
// for hashed static assets (/_next/static/**) since those are immutable —
// same hash always means same content, safe to cache indefinitely.

// Bumped to v2: middleware used to redirect unauthenticated /manifest.json
// requests to /login, so anyone who installed this service worker before
// that was fixed may have cached the login page's HTML under the
// /manifest.json cache key. The activate handler below deletes any cache
// whose name doesn't match CACHE_NAME, so bumping this forces a clean
// re-fetch of the app shell instead of continuing to serve that stale,
// broken entry.
const CACHE_NAME = 'bespoke-billing-shell-v2';
const APP_SHELL = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {
      // Best-effort: don't fail install if a shell route can't be
      // pre-cached (e.g. dev server not ready yet).
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isStaticAsset = url.pathname.startsWith('/_next/static/');
  const isNavigation = request.mode === 'navigate';

  if (isStaticAsset) {
    // Cache-first: hashed filenames mean the content never changes for a
    // given URL, so there's no reason to ever re-fetch a cached one.
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
    return;
  }

  if (isNavigation) {
    // Network-first: prefer the live page when online (so users aren't
    // stuck on a stale build), fall back to the cached shell when offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
  }
});
