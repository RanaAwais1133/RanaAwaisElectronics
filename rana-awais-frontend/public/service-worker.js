// ═══════════════════════════════════════════════════════════════
// ✅ Rana Awais Electronics - Service Worker v4
// ✅ Full offline-first PWA support
// ✅ Cache all static assets on install
// ✅ Network-first for API calls, fallback to cache
// ✅ Background sync for offline operations
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'rana-awais-electronics-v4';
const STATIC_CACHE = 'rana-awais-static-v4';
const API_CACHE = 'rana-awais-api-v4';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
];

// API routes to cache (for Cache API - used as fallback when IndexedDB is not available)
const API_ROUTES = [
  '/api/dashboard/summary',
  '/api/dashboard/today-installments',
  '/api/dashboard/today-due-full',
  '/api/dashboard/overdue-full',
  '/api/dashboard/overdue',
  '/api/dashboard/today-due',
  '/api/dashboard/low-stock',
  '/api/dashboard/monthly-due',
  '/api/dashboard/active-installments',
  '/api/dashboard/completed-installments',
  '/api/dashboard/customers-with-finance',
  '/api/dashboard/collection-stats',
  '/api/dashboard/today-installment-stats',
  '/api/customers',
  '/api/products',
  '/api/installments',
  '/api/installments/plans',
  '/api/installments/upcoming',
  '/api/installments/detailed-report',
  '/api/promises',
  '/api/promises/pending',
  '/api/promises/today',
  '/api/guarantors',
  '/api/inventory',
  '/api/inventory/ageing',
  '/api/payments',
  '/api/payments/list',
  '/api/expenses',
  '/api/reports',
  '/api/reports/customers',
  '/api/reports/daily',
  '/api/reports/weekly',
  '/api/reports/monthly',
  '/api/reports/date-range',
  '/api/admin/users',
  '/api/admin/backup/settings',
  '/api/admin/settings',
  '/api/license/status',
  '/api/accounting/today',
  '/api/accounting/month',
  '/api/accounting/pending-total',
  '/api/accounting/total-paid',
  '/api/accounting/summary',
  '/api/accounting/product-wise',
  '/api/accounting/profit-loss/cash',
  '/api/accounting/profit-loss/accrual',
  '/api/audit-logs',
  '/api/sync',
  '/api/health',
];

// ═══════════════════════════════════════════════════════════════
// 📦 INSTALL - Pre-cache static assets
// ═══════════════════════════════════════════════════════════════

self.addEventListener('install', (event) => {
  console.log('✅ Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('⚠️ Some assets failed to pre-cache:', err);
      });
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// ═══════════════════════════════════════════════════════════════
// 🚀 ACTIVATE - Clean old caches
// ═══════════════════════════════════════════════════════════════

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  
  // Clean old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== STATIC_CACHE && name !== API_CACHE && name !== CACHE_NAME;
          })
          .map((name) => {
            console.log('🗑️ Removing old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Claim all clients
  self.clients.claim();
});

// ═══════════════════════════════════════════════════════════════
// 🔄 FETCH - Network-first with cache fallback
// ═══════════════════════════════════════════════════════════════

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // ✅ Skip non-GET requests
  if (request.method !== 'GET') {
    // For POST/PUT/DELETE, try network only
    // If offline, the app will queue them via IndexedDB
    return;
  }
  
  // ✅ Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }
  
  // ✅ Handle static assets (JS, CSS, images)
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // ✅ Handle navigation (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithCache(request, CACHE_NAME));
    return;
  }
  
  // ✅ Default: network first
  event.respondWith(networkFirstWithCache(request, CACHE_NAME));
});

// ═══════════════════════════════════════════════════════════════
// 📥 STRATEGIES
// ═══════════════════════════════════════════════════════════════

// Network-first: Try network, fallback to cache
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok || response.status === 200) {
      const cache = await caches.open(cacheName);
      // Clone response since it can only be consumed once
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('📦 Serving from cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's a navigation request, serve index.html (SPA fallback)
    if (request.mode === 'navigate') {
      const indexCache = await caches.match('/index.html');
      if (indexCache) {
        return indexCache;
      }
    }
    
    // Return a basic offline page
    return new Response(
      JSON.stringify({ 
        success: false, 
        offline: true, 
        message: 'You are offline. Data will sync when connection is restored.' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Cache-first: Try cache first, fallback to network
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.warn('⚠️ Failed to fetch:', request.url);
    
    // Return a minimal response for assets
    if (request.url.match(/\.(js|css)$/)) {
      return new Response('', { status: 200 });
    }
    
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// 📨 MESSAGE HANDLING
// ═══════════════════════════════════════════════════════════════

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'SYNC_NOW') {
    // Notify all clients to sync
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SYNC_NOW' });
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 🔄 BACKGROUND SYNC
// ═══════════════════════════════════════════════════════════════

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    // Notify the app to sync
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_NOW' });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔄 PERIODIC BACKGROUND SYNC
// ═══════════════════════════════════════════════════════════════

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-sync') {
    event.waitUntil(syncData());
  }
});

// ═══════════════════════════════════════════════════════════════
// 📡 PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const title = data.title || 'Rana Awais Electronics';
    const options = {
      body: data.body || '',
      icon: '/logo192.png',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/',
      },
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    console.warn('Push notification parse failed:', e);
  }
});

// ═══════════════════════════════════════════════════════════════
// 🔗 NOTIFICATION CLICK HANDLER
// ═══════════════════════════════════════════════════════════════

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If a window client is already open, focus it
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: urlToOpen });
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('✅ Service Worker loaded');


