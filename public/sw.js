/* UnionOps offline stub — caches a minimal shell so Comms can open without cell service.
   Hub API data still requires a network when live; encrypted hybrid backup covers offline case data.
   Keep CACHE / PRECACHE in sync with src/lib/pwa/shell.ts (enforced by unit tests).

   Safety (PC / Edge installed PWA):
   - Intercept navigations only. Never cache-first RSC, JS, or API — that poisoned
     Next.js App Router payloads and looked like a homescreen reload loop.
   - skipWaiting so updates activate, but never claim existing clients mid-load —
     that made Chromium/Edge installed apps flash-reload the start_url. */
const CACHE = "unionops-shell-v3";
const PRECACHE = ["/en/", "/manifest.webmanifest", "/og-image.png"];

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
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      ),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Navigations only — assets / RSC / API go straight to the network (no respondWith).
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.match("/en/").then((r) => r || Response.error()),
    ),
  );
});
