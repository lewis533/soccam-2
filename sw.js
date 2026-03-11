const CACHE = 'lapp-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap'
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate — clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first for API calls, cache first for everything else
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always go network for Google Apps Script and Cloudinary — never cache these
  if (url.includes('script.google.com') || url.includes('cloudinary.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Network first for HTML files — always get fresh version
  if (url.includes('.html') || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache first for everything else (fonts, manifest, etc)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
        }
        return response;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
