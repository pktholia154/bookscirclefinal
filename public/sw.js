// BooksCircle Service Worker (Static Media Assets Only)
const CACHE_NAME = 'bookscircle-v12';
const STATIC_ASSETS = [
  '/manifest.json',
  '/booksCircle (3).png',
  '/booksCircle (2).png',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache error:', err);
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
  // Never intercept POST/PUT/DELETE, API, Next.js internal chunks, or 3rd-party auth/payment
  const url = event.request.url;
  if (
    event.request.method !== 'GET' ||
    url.includes('/api/') ||
    url.includes('/_next/') ||
    url.endsWith('.js') ||
    url.endsWith('.mjs') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('razorpay.com')
  ) {
    return;
  }

  // Only handle static media assets
  const isStaticMedia =
    url.endsWith('.png') ||
    url.endsWith('.jpg') ||
    url.endsWith('.jpeg') ||
    url.endsWith('.svg') ||
    url.endsWith('.ico') ||
    url.endsWith('.woff2') ||
    url.endsWith('.woff') ||
    url.endsWith('/manifest.json');

  if (!isStaticMedia) {
    return;
  }

  // Network-First strategy with cache fallback to guarantee fresh logos on publish
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
