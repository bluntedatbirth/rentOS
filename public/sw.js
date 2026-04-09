// RentOS Service Worker — App Shell Caching + Push Notifications

const CACHE_NAME = 'rentos-v2';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ─── Install: cache app shell ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll will silently fail on missing resources — use individual adds
      return Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

// ─── Activate: remove old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: routing strategies ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never cache API calls or Supabase requests — always go to network
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    return; // Let the browser handle it normally
  }

  // Cache-first for static assets (JS, CSS, images, fonts, icons)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first with offline fallback for navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Default: let the browser handle it (no caching)
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/fonts/') ||
    /\.(js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|ico|webp)$/.test(pathname)
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = (await caches.match(request)) || (await caches.match('/'));
    if (cached) return cached;
    return new Response(
      '<!DOCTYPE html><html><head><title>RentOS — Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F9FAFB;color:#1F2937}.card{text-align:center;padding:2rem;background:#fff;border-radius:1rem;box-shadow:0 1px 3px rgba(0,0,0,.1);max-width:320px}h1{color:#2563EB;font-size:2rem;margin:0 0 .5rem}p{margin:.5rem 0;color:#6B7280}</style></head><body><div class="card"><h1>R</h1><h2>RentOS</h2><p>You are offline.</p><p>Please check your connection and try again.</p></div></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ─── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'RentOS';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
