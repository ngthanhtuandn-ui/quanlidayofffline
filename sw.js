/* Service Worker PWA. External OCR assets are best-effort; see README for offline limitation. */
const CACHE_NAME = 'lan-trai-pwa-v2';
const CORE_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const CDN_FILES = [
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(CORE_FILES); } catch (e) { console.warn('Một số tệp lõi chưa cache được', e); }
    for (const url of CDN_FILES) {
      try { const response = await fetch(url, { mode: 'no-cors', cache: 'reload' }); if (response) await cache.put(url, response); }
      catch (e) { console.warn('Không cache được thư viện:', url); }
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('lan-trai-pwa-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const isCDN = CDN_FILES.includes(request.url);
  if (isCDN) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request.url); if (cached) return cached;
      try { const response = await fetch(request); if (response && (response.ok || response.type === 'opaque')) cache.put(request.url, response.clone()); return response; }
      catch (e) { return new Response('/* Thư viện chưa có trong cache. Kết nối mạng và tải lại ứng dụng. */', { status: 503, headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }); }
    })()); return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try { const response = await fetch(request); if (response && response.ok) cache.put(request, response.clone()); return response; }
      catch (e) { const cached = await cache.match(request); if (cached) return cached; if (request.mode === 'navigate') { const index = await cache.match('./index.html'); if (index) return index; } return new Response('Không có kết nối và tài nguyên chưa được lưu offline.', { status: 503 }); }
    })());
  }
});
