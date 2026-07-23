import { routing, type Locale } from "@/i18n/routing";

/**
 * Offline shell constants — must stay in sync with `public/sw.js`.
 * Unit tests assert the SW file still embeds these values and the safe fetch policy.
 *
 * Bump `PWA_SHELL_CACHE` whenever SW fetch/activate policy changes so installed
 * PWAs drop poisoned caches from older workers.
 */
export const PWA_SHELL_CACHE = "unionops-shell-v4";

/** Supported locale shells for offline navigation fallback. */
export const PWA_SHELL_LOCALES = routing.locales;

/** Minimal precache so a cold open can fall back without cell service. */
export const PWA_SHELL_PRECACHE = [
  "/en/",
  "/fr/",
  "/manifest.webmanifest",
  "/og-image.png",
] as const;

export const PWA_SERVICE_WORKER_URL = "/sw.js";

/**
 * Documented SW safety contract (mirrored in shell.test.ts against public/sw.js).
 * Installed Edge/Chrome PWAs glitched when the worker claimed clients mid-load
 * and cache-first'd non-navigation GETs (RSC / hashed chunks).
 */
export const PWA_SW_POLICY = {
  /** Activate updates without waiting for all tabs to close. */
  skipWaiting: true,
  /** Do not claim existing clients — avoids start_url flash-reload on PC install. */
  clientsClaim: false,
  /** Only `request.mode === "navigate"` may use respondWith. */
  navigateOnly: true,
  /** Navigations are network-first with precached locale shell offline fallback. */
  navigateNetworkFirst: true,
} as const;

/** Cache key used by the SW to remember the last successful navigate locale. */
export const PWA_LAST_LOCALE_CACHE_URL = "/__pwa_last_locale";

export function isPwaShellLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (routing.locales as readonly string[]).includes(value)
  );
}

/**
 * Map a navigation pathname to the precached offline shell path.
 * Prefers the URL locale prefix; falls back to `lastKnownLocale`, then default.
 */
export function resolveOfflineShellPath(
  pathname: string,
  lastKnownLocale?: string | null,
): `/${Locale}/` {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (isPwaShellLocale(seg)) {
    return `/${seg}/`;
  }
  if (isPwaShellLocale(lastKnownLocale)) {
    return `/${lastKnownLocale}/`;
  }
  return `/${routing.defaultLocale}/`;
}
