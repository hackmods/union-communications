/**
 * Offline shell constants — must stay in sync with `public/sw.js`.
 * Unit tests assert the SW file still embeds these values and the safe fetch policy.
 *
 * Bump `PWA_SHELL_CACHE` whenever SW fetch/activate policy changes so installed
 * PWAs drop poisoned caches from older workers.
 */
export const PWA_SHELL_CACHE = "unionops-shell-v3";

/** Minimal precache so a cold open can fall back without cell service. */
export const PWA_SHELL_PRECACHE = [
  "/en/",
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
  /** Navigations are network-first with precached `/en/` offline fallback. */
  navigateNetworkFirst: true,
} as const;
