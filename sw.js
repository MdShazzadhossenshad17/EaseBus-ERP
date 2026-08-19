/**
 * EaseBus — Progressive Web App (PWA) Service Worker
 */

const CACHE_NAME = 'easebus-cache-v29.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/img/logo.png',
  '/assets/js/api.js?v=3.0',
  '/assets/js/components.js?v=3.0',
  '/assets/js/dashboard.js?v=3.0',
  '/assets/js/products.js?v=3.0',
  '/assets/js/orders.js?v=3.0',
  '/assets/js/customers.js?v=3.0',
  '/assets/js/suppliers.js?v=3.0',
  '/assets/js/deliveries.js?v=3.0',
  '/assets/js/returns.js?v=3.0',
  '/assets/js/finance.js?v=3.0',
  '/assets/js/expenses.js?v=3.0',
  '/assets/js/inventory.js?v=3.0',
  '/assets/js/investors.js?v=3.0',
  '/assets/js/reports.js?v=3.0',
  '/assets/js/settings.js?v=3.0',
  '/assets/js/users.js?v=3.0',
  '/assets/js/creator.js?v=3.0',
  '/assets/js/app.js?v=3.0',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
