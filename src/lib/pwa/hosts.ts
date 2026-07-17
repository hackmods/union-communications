/**
 * Hosts where the offline shell service worker may register (installable PWA).
 * Apex only until www redirects to unionops.org with a trusted cert — today
 * www.unionops.org is a CapRover stub without the app/manifest.
 */
export const PWA_PRODUCTION_HOSTS = new Set(["unionops.org"]);

/**
 * Chromium install prompts and the offline shell SW only run on production
 * UnionOps hosts. Localhost/CI/staging/www stub must not register — SW fetch
 * interception hangs Playwright and would advertise a non-production install target.
 */
export function shouldRegisterServiceWorker(hostname: string): boolean {
  return PWA_PRODUCTION_HOSTS.has(hostname.trim().toLowerCase());
}
