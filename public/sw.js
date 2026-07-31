// Service Worker de Mapa Sticker (PWA básica)
// Estrategia:
//  - CDN (Leaflet, Tailwind, exifr): cache-first para funcionar offline
//  - /api/*: siempre red (nunca cachear datos)
//  - Estáticos propios: network-first con respaldo en caché
const CACHE = 'ms-cache-v1';
const CDN_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js',
  'https://cdn.tailwindcss.com',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CDN_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

async function networkFirst(req, fallbackUrl) {
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    if (fallbackUrl) return caches.match(fallbackUrl); // shell offline
    return new Response('Offline', { status: 503 });
  }
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API: solo red
  if (url.pathname.startsWith('/api/')) return;

  // CDN: cache-first
  if (url.origin !== self.location.origin) {
    if (CDN_ASSETS.includes(request.url)) {
      e.respondWith(cacheFirst(request));
    }
    return;
  }

  // Navegación: network-first con fallback al shell
  if (request.mode === 'navigate') {
    e.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  // Estáticos propios: network-first
  e.respondWith(networkFirst(request));
});
