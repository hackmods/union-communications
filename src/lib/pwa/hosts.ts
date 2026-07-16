/** Hosts where the offline shell service worker may register (installable PWA). */
export const PWA_PRODUCTION_HOSTS = new Set([
  "unionops.org",
  "www.unionops.org",
]);

/**
 * Chromium install prompts and the offline shell SW only run on production
 * UnionOps hosts. Localhost/CI/staging must not register — SW fetch interception
 * hangs Playwright and would advertise a non-production install target.
 */
export function shouldRegisterServiceWorker(hostname: string): boolean {
  return PWA_PRODUCTION_HOSTS.has(hostname.trim().toLowerCase());
}
