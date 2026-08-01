// Service Worker de Mapa Sticker (PWA básica)
// Todos los recursos son propios (autohospedados, sin CDN):
//  - Instalación: precache del shell + estilos + vendor
//  - /api/*: siempre red (nunca cachear datos)
//  - Estáticos propios: network-first con respaldo en caché
const CACHE = 'ms-cache-v2';
const PRECACHE_ASSETS = [
  '/index.html',
  '/css/style.css',
  '/vendor/tailwind.js',
  '/vendor/leaflet/leaflet.css',
  '/vendor/leaflet/leaflet.js',
  '/vendor/exifr.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE_ASSETS)).catch(() => {})
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

  // Navegación: network-first con fallback al shell
  if (request.mode === 'navigate') {
    e.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  // Estáticos propios: network-first
  e.respondWith(networkFirst(request));
});
