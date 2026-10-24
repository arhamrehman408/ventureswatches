// Ventures Watches - Resilient Media Cache Service Worker
const CACHE_NAME = 'ventures-media-cache-v1';
const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <radialGradient id="luxBg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#14213d"/>
      <stop offset="100%" stop-color="#0b1320"/>
    </radialGradient>
  </defs>
  <rect width="600" height="600" fill="url(#luxBg)"/>
  <circle cx="300" cy="300" r="200" fill="none" stroke="#d4af37" stroke-width="3" opacity="0.8"/>
  <circle cx="300" cy="300" r="170" fill="#0d1b2a" stroke="#d4af37" stroke-width="1.5" stroke-dasharray="3,6"/>
  <circle cx="300" cy="300" r="8" fill="#d4af37"/>
  <line x1="300" y1="300" x2="300" y2="170" stroke="#f4e8c1" stroke-width="4" stroke-linecap="round"/>
  <line x1="300" y1="300" x2="380" y2="300" stroke="#f4e8c1" stroke-width="3" stroke-linecap="round"/>
  <text x="300" y="240" font-family="serif" font-size="20" font-weight="700" fill="#f4e8c1" text-anchor="middle" letter-spacing="5">VENTURES</text>
  <text x="300" y="260" font-family="sans-serif" font-size="10" font-weight="600" fill="#d4af37" text-anchor="middle" letter-spacing="3">WATCHES</text>
  <text x="300" y="380" font-family="sans-serif" font-size="11" font-weight="500" fill="#cbd5e1" text-anchor="middle" letter-spacing="1">AUTHENTIC HOROLOGY</text>
</svg>`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clear out outdated media caches if version bumped
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key.startsWith('ventures-media-cache-') && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

// Broadcast 404 notification to open client tabs so storage-layer hook can trigger Firestore re-sync
async function notifyClients404(requestUrl) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({
        type: 'MEDIA_404_DETECTED',
        url: requestUrl,
        timestamp: Date.now()
      });
    }
  } catch (err) {
    console.debug('[SW] Could not notify clients of 404:', err);
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // We specifically manage uploaded media assets and image requests
  const isUploadPath = url.pathname.startsWith('/uploads/');
  const isImageRequest =
    event.request.destination === 'image' ||
    Boolean(url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)$/i));

  if (!isUploadPath && !isImageRequest) {
    return; // Pass through standard API and asset requests
  }

  // Non-GET requests should not be cached
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);

      if (cachedResponse) {
        // Cache-first: Return cached asset immediately for high performance
        // Revalidate in background if online
        fetch(event.request)
          .then((networkRes) => {
            if (networkRes.ok && networkRes.status === 200) {
              cache.put(event.request, networkRes.clone());
            } else if (networkRes.status === 404) {
              notifyClients404(event.request.url);
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Not in cache: fetch from network
      try {
        const networkResponse = await fetch(event.request);

        if (networkResponse.status === 404) {
          // Asset returned 404: broadcast to React storage-layer hook to force Firestore re-sync
          notifyClients404(event.request.url);

          if (isImageRequest || isUploadPath) {
            return new Response(FALLBACK_SVG, {
              status: 200,
              headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'no-cache'
              }
            });
          }
          return networkResponse;
        }

        // Cache successful media responses
        if (networkResponse.ok && networkResponse.status === 200) {
          const contentType = networkResponse.headers.get('content-type') || '';
          if (contentType.includes('image/') || contentType.includes('video/') || isUploadPath) {
            cache.put(event.request, networkResponse.clone());
          }
        }

        return networkResponse;
      } catch (networkError) {
        // Network failure (offline / timeout)
        notifyClients404(event.request.url);

        if (isImageRequest || isUploadPath) {
          return new Response(FALLBACK_SVG, {
            status: 200,
            headers: {
              'Content-Type': 'image/svg+xml',
              'Cache-Control': 'no-cache'
            }
          });
        }
        throw networkError;
      }
    })()
  );
});

// Handle custom messages from client storage-layer hooks
self.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'CACHE_MEDIA' && data.url && data.blob) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const res = new Response(data.blob, {
        headers: {
          'Content-Type': data.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
      await cache.put(data.url, res);
    } catch (e) {
      console.warn('[SW] Could not cache media blob:', e);
    }
  } else if (data.type === 'PURGE_MEDIA_URL' && data.url) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(data.url);
    } catch {}
  } else if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
