/**
 * EaseBus ERP — Progressive Web App (PWA) Advanced Service Worker
 * Strategy: Cache-First for critical static assets, Stale-While-Revalidate for UI scripts & CSS,
 * and Network-First with Cache fallback for CDN / Fonts / API responses.
 * Features Background Sync support for offline CRUD mutations & automatic cloud synchronization.
 */

const CACHE_NAME = 'easebus-cache-v37.0';
const DATA_CACHE_NAME = 'easebus-data-cache-v37.0';

// Critical UI Assets and Code Modules to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/app.css',
  '/assets/img/logo.png',
  '/assets/js/firebase-app-compat.js',
  '/assets/js/firebase-firestore-compat.js',
  '/assets/js/firebase-db.js',
  '/assets/js/telemetry.js',
  '/assets/js/api.js',
  '/assets/js/components.js',
  '/assets/js/dashboard.js',
  '/assets/js/products.js',
  '/assets/js/orders.js',
  '/assets/js/customers.js',
  '/assets/js/suppliers.js',
  '/assets/js/deliveries.js',
  '/assets/js/returns.js',
  '/assets/js/finance.js',
  '/assets/js/expenses.js',
  '/assets/js/inventory.js',
  '/assets/js/investors.js',
  '/assets/js/reports.js',
  '/assets/js/settings.js',
  '/assets/js/users.js',
  '/assets/js/creator.js',
  '/assets/js/search.js',
  '/assets/js/app.js'
];

// External CDN dependencies to cache when loaded
const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com'
];

// Install Event: Pre-cache static shell & critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[EaseBus ServiceWorker] Pre-caching critical ERP shell assets...');
      const cachePromises = STATIC_ASSETS.map(async (url) => {
        try {
          const response = await fetch(url, { cache: 'no-cache' });
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (err) {
          console.warn(`[EaseBus ServiceWorker] Non-blocking pre-cache miss for: ${url}`);
        }
      });
      await Promise.all(cachePromises);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clear obsolete cache versions and take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log('[EaseBus ServiceWorker] Removing outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Intelligent multi-tier caching strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Navigation requests (HTML Document navigation) -> Stale-While-Revalidate / Network-First with Cache fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', clone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          if (cached) return cached;
          return caches.match('/');
        })
    );
    return;
  }

  // 2. Critical Local Assets: For JS and CSS, use Network-First with Cache fallback so updates apply immediately
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
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
            const cached = await caches.match(request);
            if (cached) return cached;
            return caches.match(url.pathname);
          })
      );
      return;
    }

    // For images, fonts, and other local static assets -> Cache-First with Stale-While-Revalidate
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => null);

        // Return cached immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise.then((res) => {
          if (res) return res;
          // Fallback to strip query string
          const cleanUrl = url.pathname;
          return caches.match(cleanUrl);
        });
      })
    );
    return;
  }

  // 3. CDN, Google Fonts, and external libraries -> Stale-While-Revalidate & Cache
  const isCdn = CDN_HOSTS.some((host) => url.hostname.includes(host));
  if (isCdn) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              const responseClone = networkResponse.clone();
              caches.open(DATA_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // 4. Default: Network with Cache Fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(DATA_CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});

// Background Sync Handler for offline CRUD queues (orders, products, customers, expenses, etc.)
self.addEventListener('sync', (event) => {
  console.log('[EaseBus ServiceWorker] Background Sync event triggered:', event.tag);
  if (event.tag === 'sync-easebus-mutations' || event.tag.startsWith('sync-')) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'EASEBUS_BACKGROUND_SYNC',
            tag: event.tag,
            timestamp: Date.now()
          });
        });
      })
    );
  }
});

// Periodic Background Sync (if supported by modern browser engine)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'easebus-periodic-resync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'EASEBUS_BACKGROUND_SYNC',
            tag: 'periodic',
            timestamp: Date.now()
          });
        });
      })
    );
  }
});

// Background Sync / Message Listeners
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    });
  }
  if (event.data && event.data.type === 'TRIGGER_SYNC_BROADCAST') {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'EASEBUS_BACKGROUND_SYNC',
          tag: 'manual-trigger',
          timestamp: Date.now()
        });
      });
    });
  }
});
