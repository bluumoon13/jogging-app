const CACHE_NAME = 'runtrack-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

// Install: cache all assets so app works offline
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Serve from cache when offline
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});

// ── Background GPS via messages ──────────────────────────────────────────────
// The main page sends GPS points here; SW stores them in case the page closes.
// On resume, the page requests the buffered points.

let bufferedPositions = [];
let isTracking = false;

self.addEventListener('message', e => {
  const { type, payload } = e.data || {};

  switch (type) {
    case 'START_TRACKING':
      isTracking = true;
      bufferedPositions = payload?.existing || [];
      break;

    case 'STOP_TRACKING':
      isTracking = false;
      break;

    case 'GPS_POINT':
      if (isTracking) bufferedPositions.push(payload);
      // Broadcast to all open windows so any open tab stays in sync
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'GPS_UPDATE', payload }));
      });
      break;

    case 'GET_BUFFER':
      e.source.postMessage({ type: 'BUFFER_RESPONSE', payload: bufferedPositions });
      break;

    case 'PING':
      e.source.postMessage({ type: 'PONG' });
      break;
  }
});
