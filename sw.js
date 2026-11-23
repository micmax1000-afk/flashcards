/* Service Worker per Flashcards PWA */
const CACHE_NAME = "flashcards-v3";
// Percorsi relativi: valgono sia alla radice del sito sia in una sottocartella (es. GitHub Pages /flashcards/)
const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "data/index.js",
  "data/en.js",
  "data/es.js",
  "data/fr.js",
  "data/de.js",
  "icons/icon-192.svg",
  "icons/icon-512.svg",
  "icons/icon-512-maskable.svg",
  "icons/apple-touch-icon.svg"
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
  // Solo richieste GET
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          // Non mettere in cache risposte non valide o di altri origin
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Offline e non in cache: per navigazioni torna index
          if (event.request.mode === "navigate") {
            return caches.match("index.html");
          }
        });
    })
  );
});