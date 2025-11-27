// Vcanship Service Worker - SEO & Performance Optimization
// Version: 3.0.0 - Phase 3 SEO Foundation

const CACHE_NAME = 'vcanship-v3-seo-fix-1';
const STATIC_CACHE_NAME = 'vcanship-static-v3-fix-1';
const DYNAMIC_CACHE_NAME = 'vcanship-dynamic-v3-fix-1';

// Critical files for SEO and performance
const STATIC_FILES = [
  '/',
  '/index.html',
  '/index.css',
  '/index.js',
  '/manifest.json',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/logo.svg',

  // Service landing pages for SEO
  '/parcel-delivery',
  '/fcl-shipping',
  '/lcl-shipping',
  '/air-freight',
  '/vehicle-shipping',
  '/warehouse-services',
  '/bulk-cargo',
  '/railway-transport',
  '/ecommerce-shipping',

  // Essential app files
  '/ui.ts',
  '/state.ts',
  '/api.ts',
  '/router.ts',
  '/i18n.ts'
];

// URLs that should always be fetched fresh for SEO
const DYNAMIC_URLS = [
  '/sitemap.xml',
  '/robots.txt',
  '/',
  '/api/',
  '/search'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Vcanship Service Worker v3.0.0');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static files for SEO optimization');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Installation complete - SEO assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Vcanship Service Worker v3.0.0');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName.startsWith('vcanship-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Cache cleanup complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - intelligent caching for SEO
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle different types of requests for optimal SEO
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.includes('/service/')) {
    // HTML pages - stale-while-revalidate for SEO freshness
    event.respondWith(handleHTMLRequest(request));
  } else if (url.pathname.includes('/api/')) {
    // API requests - network first with offline fallback
    event.respondWith(handleAPIRequest(request));
  } else if (url.pathname.match(/\.(css|js|tsx|ts)$/)) {
    // Static assets - cache first
    event.respondWith(handleStaticRequest(request));
  } else if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) {
    // Images - cache first with long TTL
    event.respondWith(handleImageRequest(request));
  } else {
    // Everything else - network first
    event.respondWith(handleGenericRequest(request));
  }
});

// HTML requests - stale-while-revalidate for SEO
async function handleHTMLRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    // Fetch fresh version in background
    const fetchPromise = fetch(request).then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    });

    // Return cached version immediately if available, otherwise wait for network
    return cachedResponse || await fetchPromise;
  } catch (error) {
    console.error('[SW] HTML request failed:', error);
    return await handleOfflineRequest(request);
  }
}

// API requests - network first for real-time data
async function handleAPIRequest(request) {
  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] API offline, trying cache:', request.url);
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      JSON.stringify({ error: 'Offline - no cached data available' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Static assets - cache first
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Static request failed:', error);
    return await handleOfflineRequest(request);
  }
}

// Image requests - cache first with long TTL
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Image request failed:', error);
    // Return a placeholder image for SEO
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Vcanship</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// Generic requests - network first
async function handleGenericRequest(request) {
  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    return cachedResponse || await handleOfflineRequest(request);
  }
}

// Offline request handler
async function handleOfflineRequest(request) {
  const url = new URL(request.url);

  // Return appropriate offline page based on request type
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - Vcanship</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .offline-container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #2563eb; margin-bottom: 20px; }
          p { color: #666; line-height: 1.6; }
          .retry-btn { background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-top: 20px; }
          .retry-btn:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <h1>You're Offline</h1>
          <p>It looks like you've lost your internet connection. Please check your connection and try again.</p>
          <p><strong>Vcanship</strong> - Your global shipping platform will be available when you're back online.</p>
          <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }

  return new Response('Offline', { status: 503 });
}

// Background sync for SEO analytics
self.addEventListener('sync', (event) => {
  if (event.tag === 'seo-analytics') {
    event.waitUntil(syncSEOAnalytics());
  }
});

// Sync SEO analytics data
async function syncSEOAnalytics() {
  try {
    // Send cached analytics data when back online
    console.log('[SW] Syncing SEO analytics data');
    // Implementation would sync with analytics service
  } catch (error) {
    console.error('[SW] SEO analytics sync failed:', error);
  }
}

// Push notifications for SEO engagement
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1'
      },
      actions: [
        {
          action: 'explore',
          title: 'Get Quote',
          icon: '/images/checkmark.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/images/xmark.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification('Vcanship Update', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_SEO_PAGE') {
    const { url } = event.data;
    caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
      cache.add(url);
    });
  }
});

console.log('[SW] Vcanship Service Worker v3.0.0 loaded - SEO optimized');