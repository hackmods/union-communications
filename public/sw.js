/* UnionOps offline stub — caches a minimal shell so Officer Hub UI can load without cell service.
   Hub API data still requires a network when live; encrypted hybrid backup covers offline case data. */
const CACHE = "unionops-shell-v1";
const PRECACHE = [
  "/en/",
  "/en/app/",
  "/manifest.webmanifest",
  "/og-image.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          if (response.ok && request.url.startsWith(self.location.origin)) {
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match("/en/app/").then((r) => r || caches.match("/en/")));
    }),
  );
});
