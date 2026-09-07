// IELTS Vocab Master - Network-First Service Worker (Auto-Update)
const CACHE_NAME = 'ielts-vocab-v7-streak';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js?v=20260908e',
  './js/speech.js?v=20260908e',
  './js/srs.js?v=20260908e',
  './js/storage.js?v=20260908e',
  './js/data/ielts_words.js?v=20260908e',
  './js/modes/flashcard.js?v=20260908e',
  './js/modes/quiz.js?v=20260908e',
  './js/modes/spelling.js?v=20260908e',
  './js/modes/matching.js?v=20260908e',
  './js/modes/fillblank.js?v=20260908e',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('[SW] Deleting obsolete cache:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Always fetch fresh from network for instant updates, fallback to cache if offline
  e.respondWith(
    fetch(e.request).then((response) => {
      if (response && response.status === 200 && e.request.method === 'GET') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(e.request).then((res) => res || caches.match('./index.html'));
    })
  );
});
