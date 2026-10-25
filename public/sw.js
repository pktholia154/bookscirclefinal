// BooksCircle Universal Enterprise Service Worker (v18)
// Implements:
// 1. Automatic version invalidation & immediate cache flushing
// 2. Offline Navigation App-Shell Fallback (Required for Chromium beforeinstallprompt & Airplane Mode launch)
// 3. Stale-While-Revalidate for Identity & Icon Assets (Android WebAPK, iOS SpringBoard, Windows/macOS)
// 4. Client message listeners for instant remote cache flush

const CACHE_NAME = 'bookscircle-v18';
const SHELL_CACHE_NAME = 'bookscircle-shell-v18';

const IDENTITY_AND_SHELL_ASSETS = [
  '/',
  '/?source=pwa',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-maskable-192x192.png',
  '/icon-maskable-512x512.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/booksCircle%20(3).png',
  '/booksCircle%20(2).png',
  '/logo.png',
  '/favicon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
];

const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#FFFFFF" />
  <title>BooksCircle - Offline Library</title>
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #FFFFFF;
      color: #111827;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      max-width: 380px;
      width: 100%;
      border: 1px solid #E5E7EB;
      border-radius: 20px;
      padding: 28px 24px;
      background: #FFFFFF;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      margin: 0 auto 16px;
      display: block;
    }
    h1 {
      font-size: 18px;
      font-weight: 900;
      color: #111827;
      margin-bottom: 8px;
    }
    p {
      font-size: 13px;
      line-height: 1.5;
      color: #4B5563;
      margin-bottom: 20px;
    }
    button {
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-radius: 12px;
      background: #4029AB;
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="/icon-192x192.png" alt="BooksCircle" class="icon" />
    <h1>You’re Currently Offline</h1>
    <p>BooksCircle is running in standalone offline mode. Reconnect to the internet to sync the latest exam catalog or tap Retry below.</p>
    <button onclick="window.location.reload()">Retry Connection</button>
  </div>
</body>
</html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        IDENTITY_AND_SHELL_ASSETS.map((url) =>
          fetch(url, { credentials: 'omit', cache: 'reload' })
            .then((res) => {
              if (res && res.status === 200) {
                return cache.put(url, res);
              }
            })
            .catch(() => cache.add(url).catch(() => {}))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== SHELL_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'FLUSH_ALL_CACHES' || event.data?.type === 'FLUSH_ALL_CACHES') {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        caches.delete(key);
      });
    });
  }
});

function isIdentityOrIconAsset(pathname) {
  return (
    pathname === '/manifest.webmanifest' ||
    pathname === '/manifest.json' ||
    pathname === '/apple-touch-icon.png' ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.png' ||
    pathname === '/favicon-16x16.png' ||
    pathname === '/favicon-32x32.png' ||
    pathname === '/logo.png' ||
    pathname.startsWith('/icon-') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/booksCircle')
  );
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let parsedUrl;
  try {
    parsedUrl = new URL(event.request.url);
  } catch {
    return;
  }

  // Never intercept cross-origin requests (Firestore, Google Auth, Razorpay) or API/RSC routes
  if (
    parsedUrl.origin !== self.location.origin ||
    parsedUrl.pathname.startsWith('/api/') ||
    event.request.headers.get('RSC') === '1' ||
    parsedUrl.searchParams.has('_rsc')
  ) {
    return;
  }

  // 1. Navigation requests: Network-First with Offline App-Shell Fallback
  // Required by Chromium for PWA installability qualification & Airplane Mode launches
  if (event.request.mode === 'navigate') {
    const isForcedFlush =
      parsedUrl.searchParams.has('_flush') ||
      parsedUrl.searchParams.has('_v') ||
      parsedUrl.searchParams.has('_sync');

    if (isForcedFlush) {
      event.respondWith(
        fetch(event.request, { cache: 'reload' })
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(SHELL_CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
                if (parsedUrl.pathname === '/') {
                  cache.put('/', networkResponse.clone());
                }
              });
            }
            return networkResponse;
          })
          .catch(() => caches.match(event.request))
      );
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(SHELL_CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
              if (parsedUrl.pathname === '/') {
                cache.put('/', networkResponse.clone());
              }
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const shellCache = await caches.open(SHELL_CACHE_NAME);
          const exactMatch = await shellCache.match(event.request);
          if (exactMatch) return exactMatch;

          const rootShell = (await shellCache.match('/')) || (await caches.match('/')) || (await caches.match('/?source=pwa'));
          if (rootShell) return rootShell;

          return new Response(OFFLINE_FALLBACK_HTML, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // 2. Identity & Icon Assets: Stale-While-Revalidate
  // Guarantees zero icon fetch failures during Android WebAPK / iOS SpringBoard / Windows installation
  if (isIdentityOrIconAsset(parsedUrl.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // 3. Static fonts & images: Network-First with Cache Fallback
  const isStaticMedia =
    parsedUrl.pathname.endsWith('.png') ||
    parsedUrl.pathname.endsWith('.jpg') ||
    parsedUrl.pathname.endsWith('.jpeg') ||
    parsedUrl.pathname.endsWith('.svg') ||
    parsedUrl.pathname.endsWith('.ico') ||
    parsedUrl.pathname.endsWith('.woff2') ||
    parsedUrl.pathname.endsWith('.woff');

  if (!isStaticMedia || parsedUrl.pathname.startsWith('/_next/')) {
    return;
  }

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
