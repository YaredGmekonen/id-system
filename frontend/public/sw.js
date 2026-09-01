const CACHE_NAME = 'siliconlabs-id-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // 1. Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension:, blob:, data:)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // 2. Bypass Vite dev server internal scripts, HMR, hot updates, and dev assets
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.search.includes('v=') ||
    url.search.includes('t=') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.port === '5173'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          (url.protocol === 'http:' || url.protocol === 'https:')
        ) {
          try {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            });
          } catch {
            // Ignore caching errors
          }
        }
        return networkResponse;
      }).catch(() => {
        return caches.match('/') || caches.match('/index.html');
      });
    })
  );
});
