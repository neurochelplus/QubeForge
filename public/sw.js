const CACHE_NAME = 'mc-store-v3';
const CONTENT_TO_CACHE = [
  '/',
  '/index.html',
];

self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CONTENT_TO_CACHE);
    }),
  );
});

self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Activate');
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // В dev-режиме пропускаем всё напрямую
  if (e.request.url.includes('localhost')) {
    return;
  }
  
  // Только GET запросы
  if (e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .catch(() => {
        return caches.match(e.request).then((response) => {
          if (response) {
            return response;
          }
          return new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          });
        });
      })
  );
});
