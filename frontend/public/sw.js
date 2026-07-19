const CACHE_VERSION = 'v3';
const STATIC_CACHE = `autism-static-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const SHELL_ASSETS = [
  '/manifest.json',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// ── Install: uygulama kabuğunu önbelleğe al ──────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: eski önbellekleri temizle ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: strateji yönlendirmesi ─────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;

  // Hassas API cevapları hiçbir zaman Cache Storage'a yazılmaz.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkOnlyApi(request));
    return;
  }

  // Navigasyon istekleri → SPA shell, offline'da /offline.html
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Statik varlıklar → Cache First
  if (url.pathname.match(/\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|ico|webp)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put('/index.html', response.clone());
    }
    return response;
  } catch {
    return caches.match('/index.html').then((cached) => cached || caches.match(OFFLINE_URL));
  }
}

async function networkOnlyApi(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: 'Çevrimdışısınız. İnternet bağlantınızı kontrol edin.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ── Push bildirimleri ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Otizm Destek', body: 'Yeni bildiriminiz var.', icon: '/icon-192.png' };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; }
    catch { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'default',
      renotify: true,
      data: { url: data.url || data.link || '/' },
      actions: data.actions || [],
    })
  );
});

// ── Bildirim tıklama ──────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find(
          (c) => c.url.startsWith(self.location.origin) && 'focus' in c
        );
        if (existing) {
          existing.navigate(targetUrl);
          return existing.focus();
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
