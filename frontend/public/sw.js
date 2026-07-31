const CACHE_NAME = 'yazoo-public-assets-v2'
const PUBLIC_ASSETS = ['/yazoo-logo.webp', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png', '/icons.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_ASSETS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) {
    return
  }

  if (!PUBLIC_ASSETS.includes(url.pathname)) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => cachedResponse || fetch(request)),
  )
})
