/* UnionOps offline stub — caches a minimal shell so Comms can open without cell service.
   Hub API data still requires a network when live; encrypted hybrid backup covers offline case data.
   Keep CACHE / PRECACHE in sync with src/lib/pwa/shell.ts (enforced by unit tests).

   Safety (PC / Edge installed PWA):
   - Intercept navigations only. Never cache-first RSC, JS, or API — that poisoned
     Next.js App Router payloads and looked like a homescreen reload loop.
   - skipWaiting so updates activate, but never claim existing clients mid-load —
     that made Chromium/Edge installed apps flash-reload the start_url. */
const CACHE = "unionops-shell-v4";
const PRECACHE = ["/en/", "/fr/", "/manifest.webmanifest", "/og-image.png"];
const LOCALES = ["en", "fr"];
const LAST_LOCALE_URL = "/__pwa_last_locale";

function localeFromPathname(pathname) {
  const seg = pathname.split("/").filter(Boolean)[0];
  return LOCALES.includes(seg) ? seg : null;
}

function shellPathForLocale(locale) {
  return LOCALES.includes(locale) ? `/${locale}/` : "/en/";
}

async function readLastLocale(cache) {
  try {
    const res = await cache.match(LAST_LOCALE_URL);
    if (!res) return null;
    const text = (await res.text()).trim();
    return LOCALES.includes(text) ? text : null;
  } catch {
    return null;
  }
}

async function rememberLocale(cache, locale) {
  if (!LOCALES.includes(locale)) return;
  try {
    await cache.put(
      LAST_LOCALE_URL,
      new Response(locale, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
    );
  } catch {
    /* ignore quota / put failures */
  }
}

async function offlineShell(request) {
  const cache = await caches.open(CACHE);
  let locale = null;
  try {
    locale = localeFromPathname(new URL(request.url).pathname);
  } catch {
    locale = null;
  }
  if (!locale) {
    locale = await readLastLocale(cache);
  }
  const shell = shellPathForLocale(locale || "en");
  return (await cache.match(shell)) || Response.error();
}

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
    fetch(request)
      .then((response) => {
        try {
          const locale = localeFromPathname(new URL(request.url).pathname);
          if (locale && response.ok) {
            // Fire-and-forget — do not delay the navigation response.
            caches.open(CACHE).then((cache) => rememberLocale(cache, locale));
          }
        } catch {
          /* ignore */
        }
        return response;
      })
      .catch(() => offlineShell(request)),
  );
});
