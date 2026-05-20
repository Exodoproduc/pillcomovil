// ════════════════════════════════════════════════════════════
//  Service Worker — Pillco Móvil v1.0.0
//  Estrategia: stale-while-revalidate para assets,
//              network-first para Nominatim/OSM tiles.
// ════════════════════════════════════════════════════════════

const CACHE_VERSION = 'pillco-v1.0.0';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/bienvenida_pillco_m_vil/code.html',
  '/registro_pillco_m_vil/code.html',
  '/mapa_pillco_m_vil/code.html',
  '/detalles_del_viaje_pillco_m_vil/code.html',
  // CDN críticos
  'https://cdn.tailwindcss.com/?plugins=forms,container-queries',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(err => console.warn('[SW] precache parcial:', err)))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k.startsWith('pillco-') && !k.startsWith(CACHE_VERSION))
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar GET
  if (request.method !== 'GET') return;

  // Nominatim → network-first, no cachear (datos dinámicos)
  if (url.host.includes('nominatim.openstreetmap.org')) return;

  // Tiles OSM → cache-first con expiración
  if (url.host.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache =>
        cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(networkResp => {
            if (networkResp.ok) cache.put(request, networkResp.clone());
            return networkResp;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Resto → stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(networkResp => {
        if (networkResp.ok && (request.url.startsWith('http'))) {
          const cacheTarget = STATIC_ASSETS.includes(request.url) ? STATIC_CACHE : RUNTIME_CACHE;
          caches.open(cacheTarget).then(c => c.put(request, networkResp.clone()));
        }
        return networkResp;
      }).catch(() => cached || caches.match('/index.html'));
      return cached || fetchPromise;
    })
  );
});

// ── Mensajes (para forzar actualización) ─────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
