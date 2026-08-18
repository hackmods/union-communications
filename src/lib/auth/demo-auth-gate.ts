/**
 * Demo roster login is opt-in for production self-hosts.
 * Non-production defaults to enabled so local/dev/smoke keep working.
 * Production requires NEXT_PUBLIC_DEMO_SITE=true or AUTH_ALLOW_DEMO_USERS=true.
 *
 * Callers that pass the live `process.env` (authorize, magic-link) must see the
 * **build-time** NEXT_PUBLIC_DEMO_SITE value. Next only inlines a static
 * `process.env.NEXT_PUBLIC_*` access — `env.NEXT_PUBLIC_DEMO_SITE` on a runtime
 * process.env object is empty on CapRover unless the host also set the flag.
 * That mismatch advertised demo credentials on the login page while
 * authorize() returned null.
 */
import { isDemoSite } from "@/lib/features/demo-site";

export function isDemoAuthEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const resolved =
    env === process.env
      ? {
          AUTH_ALLOW_DEMO_USERS: process.env.AUTH_ALLOW_DEMO_USERS,
          NEXT_PUBLIC_DEMO_SITE: process.env.NEXT_PUBLIC_DEMO_SITE,
          NODE_ENV: process.env.NODE_ENV,
        }
      : env;

  if (resolved.AUTH_ALLOW_DEMO_USERS === "true") return true;
  if (isDemoSite({ NEXT_PUBLIC_DEMO_SITE: resolved.NEXT_PUBLIC_DEMO_SITE })) {
    return true;
  }
  return resolved.NODE_ENV !== "production";
}
