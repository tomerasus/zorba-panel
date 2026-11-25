// ZORBA app helper: keeps a copy of the page and images so the app opens instantly
// and still shows the boat without internet. The page itself is always fetched fresh
// when online, so new versions arrive on the next open. Shelly Cloud calls are never cached.
const CACHE = 'zorba-v3'; // bump when images/icons change so phones refresh them
const SHELL = ['./', './index.html', './zorbaabove.jpeg', './icon-192.png', './icon-512.png', './manifest.webmanifest'];

self.addEventListener('install', e => {
  // Chrome may download the page by itself while this helper wakes up ("auto-preload"); in the app that would use
  // the internet on every opening, so every request is routed here first
  if (IN_APP && e.addRoutes) e.waitUntil(e.addRoutes({ condition: { urlPattern: new URLPattern({}) }, source: 'fetch-event' }).catch(() => {}));
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Inside the ZORBA Android app (a WebView) the internet is used only when the user allowed it: the page and images
// open from the saved copy. The page itself asks for a newer version with "?u=" once the internet is on.
const IN_APP = /; wv\)/.test(self.navigator.userAgent);
const FONTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

async function freshPage(url) {
  const r = await fetch(url, { cache: 'no-store' });
  // save only a real ZORBA page (never an error page or a Wi-Fi login page), and before the page reloads
  if (r.ok && (await r.clone().text()).includes("const BUILD='")) await (await caches.open(CACHE)).put('./index.html', r.clone());
  return r;
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (IN_APP && FONTS.includes(url.hostname)) { // fonts: downloaded once, then kept
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })));
    return;
  }
  if (url.origin !== self.location.origin) return; // Shelly Cloud, fonts: straight to network
  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage) {
    if (IN_APP && !url.searchParams.has('u')) {
      e.respondWith(caches.match('./index.html').then(hit => hit || freshPage(e.request.url)));
      return;
    }
    // network first: always the newest panel when online, saved copy when offline.
    // no-store skips the phone's HTTP cache (GitHub Pages says max-age=600, which kept old versions for 10 min)
    e.respondWith(freshPage(e.request.url).catch(() => caches.match('./index.html')));
  } else {
    // images and icons: saved copy first, refreshed in the background (not in the app)
    e.respondWith(caches.match(e.request).then(hit => {
      if (hit && IN_APP) return hit;
      const net = fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; });
      return hit || net;
    }));
  }
});
