/**
 * Whether the site-admin Demo Cleanup purge UI and APIs are enabled.
 *
 * Production CapRover hosts leave this unset/false. Demo / workshop hosts set
 * `SITE_ADMIN_DEMO_PURGE_ENABLED=true` when operators need to purge `is_demo`
 * rows. Default: off.
 *
 * Server-only — do not use NEXT_PUBLIC_*; the page and APIs gate on the server.
 */
export function isDemoPurgeEnabled(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): boolean {
  const raw = env.SITE_ADMIN_DEMO_PURGE_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
