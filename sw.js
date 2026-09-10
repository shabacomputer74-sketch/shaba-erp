const CACHE_NAME = 'shaba-erp-pwa-v1';
const APP_SHELL = [
  './', './SHABA_COMPUTER_ERP.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './drive-backup.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // App shell: cache-first. External libraries: stale-while-revalidate.
  if (url.origin === location.origin) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => { const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,copy)); return res; }).catch(()=>caches.match('./SHABA_COMPUTER_ERP.html'))));
    return;
  }
  if (url.hostname === 'cdn.tailwindcss.com' || url.hostname === 'unpkg.com' || url.hostname === 'accounts.google.com') {
    event.respondWith(caches.match(req).then(cached => {
      const network = fetch(req).then(res => { const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,copy)); return res; }).catch(()=>cached);
      return cached || network;
    }));
  }
});
