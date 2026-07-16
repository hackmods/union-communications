/**
 * Offline shell constants — must stay in sync with `public/sw.js`.
 * Unit tests assert the SW file still embeds these values.
 */
export const PWA_SHELL_CACHE = "unionops-shell-v2";

/** Minimal precache so a cold open can fall back without cell service. */
export const PWA_SHELL_PRECACHE = [
  "/en/",
  "/manifest.webmanifest",
  "/og-image.png",
] as const;

export const PWA_SERVICE_WORKER_URL = "/sw.js";
