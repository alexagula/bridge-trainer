// Bridge Trainer — Service Worker for PWA offline support
const CACHE_NAME = 'bridge-trainer-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/cards.css',
  './css/modules.css',
  './js/app.js',
  './js/core/constants.js',
  './js/core/card.js',
  './js/core/dealer.js',
  './js/core/evaluator.js',
  './js/bidding/opening.js',
  './js/bidding/response.js',
  './js/bidding/conventions.js',
  './js/bidding/overcall.js',
  './js/bidding/sequence.js',
  './js/play/lead.js',
  './js/play/techniques.js',
  './js/play/signals.js',
  './js/trainers/hcp-trainer.js',
  './js/trainers/opening-trainer.js',
  './js/trainers/response-trainer.js',
  './js/trainers/bidding-sim.js',
  './js/trainers/convention-drill.js',
  './js/trainers/play-trainer.js',
  './js/trainers/lead-trainer.js',
  './js/trainers/quiz-trainer.js',
  './js/reference/theory.js',
  './js/progress/tracker.js',
  './data/quizzes.js',
  './data/theory-entries.js',
  './data/scenarios.js',
];

// Install: cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('Some assets failed to cache:', err);
        // Cache what we can
        return Promise.allSettled(ASSETS.map(url => cache.add(url)));
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first strategy (perfect for offline app)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cache new requests dynamically
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback
      return caches.match('./index.html');
    })
  );
});
