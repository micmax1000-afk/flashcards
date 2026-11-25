/* Service Worker per Flashcards PWA */
const CACHE_NAME = "flashcards-v3.3.2";
// Percorsi relativi: valgono sia alla radice del sito sia in una sottocartella (es. GitHub Pages /flashcards/)
const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "theme.js",
  "manifest.json",
  "data/index.js",
  "data/en.js",
  "data/es.js",
  "data/fr.js",
  "data/de.js",
  "icons/icon-192.svg",
  "icons/icon-512.svg",
  "icons/icon-512-maskable.svg",
  "icons/apple-touch-icon.svg",
  "progress-init.js",
  "progress-utils.js"
];

// Install: cache degli asset statici. Ogni file è messo in cache da solo: se uno manca non si blocca tutta l'installazione
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

// Activate: pulizia cache vecchie
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: strategia Cache First con fallback alla rete
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const fresh = await fetch(request);
      if (fresh && fresh.ok) {
        cache.put(request, fresh.clone()).catch(() => {});
        return fresh;
      }
      const cached = await cache.match(request);
      return cached || fresh;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        return (await cache.match("index.html")) || (await cache.match("./"));
      }
      throw error;
    }
  })());
});