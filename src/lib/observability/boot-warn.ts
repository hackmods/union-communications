import { buildObservabilityHealth, type EnvBag } from "@/lib/observability/config";

let warned = false;

/** Reset one-shot warn latch (unit tests). */
export function resetObservabilityBootWarnState(): void {
  warned = false;
}

/**
 * One-time process boot warnings for common CapRover misconfigs.
 * Safe to call from `instrumentation` register() — never throws.
 */
export function warnObservabilityMisconfigOnce(
  env: EnvBag = process.env,
): void {
  if (warned) return;
  warned = true;

  const health = buildObservabilityHealth(env);

  if (health.sentryMisconfigured) {
    console.warn(
      "[observability] SENTRY_ENABLED=true but no SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN — Sentry will not send",
    );
  }

  if (health.errorLogFileMisconfigured) {
    console.warn(
      "[observability] ERROR_LOG_FILE_ENABLED=true but ERROR_LOG_FILE_PATH is empty — skipping file log",
    );
  }

  if (health.sentryClientServerMismatch) {
    console.warn(
      "[observability] Server Sentry is on but NEXT_PUBLIC_SENTRY_DSN is empty — browser errors will not reach Sentry (bake the public DSN at image build)",
    );
  }
}
