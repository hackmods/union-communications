/**
 * Demo roster login is opt-in for production self-hosts.
 * Non-production defaults to enabled so local/dev/smoke keep working.
 * Production requires NEXT_PUBLIC_DEMO_SITE=true or AUTH_ALLOW_DEMO_USERS=true.
 */
export function isDemoAuthEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  if (env.AUTH_ALLOW_DEMO_USERS === "true") return true;
  if (env.NEXT_PUBLIC_DEMO_SITE === "true") return true;
  return env.NODE_ENV !== "production";
}
