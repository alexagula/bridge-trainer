// Bridge Trainer — Service Worker for PWA offline support
const CACHE_NAME = 'bridge-trainer-v12';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/cards.css',
  './css/modules.css',
  './js/app.js',
  './js/ui/render.js',
  './js/trainers/base-trainer.js',
  './js/sw-register.js',
  './js/core/constants.js',
  './js/core/card.js',
  './js/core/dealer.js',
  './js/core/evaluator.js',
  './js/bidding/opening.js',
  './js/bidding/response.js',
  './js/bidding/conventions.js',
  './js/bidding/overcall.js',
  './js/bidding/sequence.js',
  './js/bidding/rebid.js',
  './js/play/lead.js',
  './js/play/techniques.js',
  './js/trainers/daily-mix.js',
  './js/trainers/mix/session-generator.js',
  './js/trainers/mix/task-renderers.js',
  './js/trainers/hcp-trainer.js',
  './js/trainers/opening-trainer.js',
  './js/trainers/response-trainer.js',
  './js/trainers/bidding-sim.js',
  './js/trainers/convention-drill.js',
  './js/trainers/play-trainer.js',
  './js/trainers/lead-trainer.js',
  './js/trainers/quiz-trainer.js',
  './js/reference/theory.js',
  './js/utils/bid-filter.js',
  './js/utils/bid-utils.js',
  './js/progress/tracker.js',
  './js/progress/progress-view.js',
  './data/quizzes.js',
  './data/theory-entries.js',
  './data/scenarios.js',
  './js/trainers/trick-trainer.js',
  './js/trainers/defense-trainer.js',
  './js/play/defense-scenarios.js',
  './js/notifications.js',
  './data/bridge-facts.js',
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
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k).catch(() => {}))
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
          caches.open(CACHE_NAME).then(cache =>
            cache.put(event.request, clone).catch(() => {})
          );
        }
        return response;
      });
    }).catch(() => {
      console.warn('Offline fallback for:', event.request.url);
      return caches.match('./index.html');
    })
  );
});
