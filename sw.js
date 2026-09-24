const CACHE_NAME = 'prayer-display-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/adhan@4.4.3/Adhan.min.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
