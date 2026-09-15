/* ENGRAM service worker — offline-first app shell. */
const CACHE = 'engram-v4';
const SHELL = ['./', './index.html', './privacy.html', './delete-account.html', './manifest.webmanifest', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Navigations: network first, fall back to cached shell (offline play).
  if (req.mode === 'navigate') {
    const page = new URL(req.url).pathname;
    const staticPage = page.endsWith('/privacy.html') || page.endsWith('/delete-account.html');
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(staticPage ? req : './index.html', copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html').then((shell) => shell || caches.match('./'))))
    );
    return;
  }

  // Everything else: cache first, then network.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (res.ok && new URL(req.url).origin === self.location.origin) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => hit)
    )
  );
});
