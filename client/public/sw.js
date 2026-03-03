// Classify Service Worker v6 — Full PWA
const CACHE_NAME = 'classify-v6';
const OFFLINE_URL = '/offline.html';
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/logo.webp',
  '/logo.jpg'
];

// ─── INSTALL ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache offline page first (critical), then others with allSettled
      return cache.add(OFFLINE_URL).then(() =>
        Promise.allSettled(
          PRECACHE_ASSETS.filter(u => u !== OFFLINE_URL).map((url) => cache.add(url))
        )
      );
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATE + Navigation Preload ─────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );

      // Enable navigation preload if supported
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      // Take control of all clients immediately
      await self.clients.claim();
    })()
  );
});

// ─── FETCH ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Let game files pass through without interception
  if (url.pathname.startsWith('/games/')) return;

  // API calls: network-only with offline JSON error
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ success: false, error: 'OFFLINE', message: 'No internet connection' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Navigation: network-first with preload, fallback to offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Use navigation preload response if available
          const preloadResponse = event.preloadResponse && (await event.preloadResponse);
          if (preloadResponse) return preloadResponse;

          return await fetch(event.request);
        } catch (error) {
          // Network failed — serve offline page
          const cache = await caches.open(CACHE_NAME);
          const offlinePage = await cache.match(OFFLINE_URL);
          return offlinePage || new Response(
            '<h1>Offline</h1><p>Please check your connection.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html' } }
          );
        }
      })()
    );
    return;
  }

  // Hashed assets (/assets/*): cache-first (immutable, built by Vite)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Static assets (icons, images, fonts): stale-while-revalidate
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|css)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── PUSH NOTIFICATIONS ────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {};
  }

  const title = payload.title || 'إشعار جديد';
  const options = {
    body: payload.body || 'لديك تحديث جديد',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || '/child-tasks',
      taskId: payload.taskId || null,
      childId: payload.childId || null,
      level: payload.level || null,
      dateOfArrival: Date.now(),
    },
    tag: payload.taskId ? `task-${payload.taskId}` : 'classify-notification',
    renotify: !!payload.taskId,
    requireInteraction: payload.level >= 4,
    actions: [
      { action: 'open', title: 'فتح', icon: '/icons/icon-96.png' },
      { action: 'dismiss', title: 'إغلاق' }
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── NOTIFICATION CLICK ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification?.data?.url || '/child-tasks';

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

      for (const client of allClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin) {
          await client.focus();
          if (typeof client.navigate === 'function') {
            try {
              await client.navigate(targetUrl);
            } catch {
              client.postMessage({ type: 'NAVIGATE', url: targetUrl });
            }
          } else {
            client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          }
          return;
        }
      }

      await clients.openWindow(targetUrl);
    })()
  );
});

// ─── PERIODIC BACKGROUND SYNC ──────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'classify-content-sync') {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.add('/');
          const allClients = await clients.matchAll({ type: 'window' });
          allClients.forEach((client) => {
            client.postMessage({ type: 'CONTENT_UPDATED' });
          });
        } catch (e) {
          // Silently fail — periodic sync is best-effort
        }
      })()
    );
  }
});

// ─── BACKGROUND SYNC ───────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'classify-offline-actions') {
    event.waitUntil(
      (async () => {
        const allClients = await clients.matchAll({ type: 'window' });
        allClients.forEach((client) => {
          client.postMessage({ type: 'ONLINE_SYNC' });
        });
      })()
    );
  }
});

// ─── MESSAGE HANDLER ────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: CACHE_NAME });
  }
});
