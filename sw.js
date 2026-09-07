// IELTS Vocab Master - Offline Cache Service Worker
const CACHE_NAME = 'ielts-vocab-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/speech.js',
  './js/srs.js',
  './js/storage.js',
  './js/data/ielts_words.js',
  './js/modes/flashcard.js',
  './js/modes/quiz.js',
  './js/modes/spelling.js',
  './js/modes/matching.js',
  './js/modes/fillblank.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Respond from cache first, then network fallback
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request).catch(() => caches.match('./index.html'));
    })
  );
});
