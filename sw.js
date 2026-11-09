// ZORBA app helper: keeps a copy of the page and images so the app opens instantly
// and still shows the boat without internet. The page itself is always fetched fresh
// when online, so new versions arrive on the next open. Shelly Cloud calls are never cached.
const CACHE = 'zorba-v2'; // bump when images/icons change so phones refresh them
const SHELL = ['./', './index.html', './zorbaabove.jpeg', './icon-192.png', './icon-512.png', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // Shelly Cloud, fonts: straight to network
  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage) {
    // network first: always the newest panel when online, saved copy when offline
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r;
    }).catch(() => caches.match('./index.html')));
  } else {
    // images and icons: saved copy first, refreshed in the background
    e.respondWith(caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; });
      return hit || net;
    }));
  }
});
