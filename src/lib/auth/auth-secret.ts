/**
 * Resolve AUTH_SECRET with fail-closed production behavior (SEC-004).
 * Never use the historical public fallback in production runtime.
 */

export const INSECURE_DEV_AUTH_SECRET = "insecure-test-only-secret";

export function resolveAuthSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const secret = env.AUTH_SECRET?.trim();
  if (secret) {
    if (secret.length < 32) {
      console.warn(
        "[auth] AUTH_SECRET should be at least 32 characters (openssl rand -base64 32).",
      );
    }
    return secret;
  }

  // next build sets NODE_ENV=production; allow compile without AUTH_SECRET,
  // but refuse to serve requests without one.
  const isProdRuntime =
    env.NODE_ENV === "production" &&
    env.NEXT_PHASE !== "phase-production-build";

  if (isProdRuntime) {
    throw new Error(
      "AUTH_SECRET is required in production. Generate with: openssl rand -base64 32",
    );
  }

  if (env.NODE_ENV !== "test") {
    console.warn(
      `[auth] AUTH_SECRET unset — using ${INSECURE_DEV_AUTH_SECRET} (dev/test/build only).`,
    );
  }
  return INSECURE_DEV_AUTH_SECRET;
}
