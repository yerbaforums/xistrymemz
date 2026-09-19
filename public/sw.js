/* XistrYmemZ Service Worker — network-first data, cache-first static, offline shell. */
const CACHE_VERSION = 'xistry-v1';
const STATIC_CACHE = CACHE_VERSION + '-static';
const PAGE_CACHE = CACHE_VERSION + '-pages';
const IMAGE_CACHE = CACHE_VERSION + '-images';

const PRECACHE_URLS = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-512-maskable.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function cachePut(req, res, cacheName) {
  try {
    if (res && res.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(req, res.clone());
    }
  } catch {}
  return res;
}

// Network first: fresh when online, cached fallback when offline.
async function networkFirst(req, fallbackUrl) {
  try {
    const res = await fetch(req);
    if (res && res.ok) await cachePut(req, res, PAGE_CACHE);
    return res;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw err;
  }
}

// Stale-while-revalidate: serve cache instantly, refresh in background.
async function staleWhileRevalidate(req, cacheName) {
  const cached = await caches.match(req);
  const network = fetch(req)
    .then((res) => cachePut(req, res, cacheName))
    .catch(() => null);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only GET requests are cached; everything else hits the network.
  if (request.method !== 'GET') return;

  // Cross-origin (IPFS gateways, maps, etc.): cache images aside for offline.
  if (url.origin !== self.location.origin) {
    if (request.destination === 'image' || url.pathname.startsWith('/ipfs/')) {
      event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    }
    return;
  }

  // API calls: never cache — always fresh.
  if (url.pathname.startsWith('/api/')) return;

  // Next.js build assets: cache-first.
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Static assets.
  if (request.destination === 'font' || request.destination === 'image' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Navigations: network-first with the home page as offline shell.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, '/'));
  }
});