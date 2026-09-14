import { resolveObservabilityConfig } from "@/lib/observability/config";
import { appendServerErrorLog } from "@/lib/observability/file-log";

export type ReportServerErrorOptions = {
  route?: string;
  /** When true, also Sentry.captureException if the SDK is enabled and loaded. */
  captureSentry?: boolean;
};

/**
 * Fan-out server errors to the file sink and optionally Sentry.
 * Safe no-op when both sinks are off. Never throws.
 */
export async function reportServerError(
  error: unknown,
  options: ReportServerErrorOptions = {},
): Promise<void> {
  const { route, captureSentry = true } = options;

  try {
    await appendServerErrorLog(error, route ? { route } : undefined);
  } catch {
    // appendServerErrorLog already swallows; belt-and-suspenders
  }

  if (!captureSentry) return;

  const cfg = resolveObservabilityConfig();
  if (!cfg.sentryEnabled) return;

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error);
  } catch {
    // SDK missing or init failed — do not break request path
  }
}

/**
 * Fire-and-forget helper for API route 500 paths.
 * Prefer `void reportApiFailure(err, "/api/…")` in catch blocks.
 */
export function reportApiFailure(
  error: unknown,
  route: string,
): void {
  void reportServerError(
    error instanceof Error ? error : new Error(String(error)),
    { route },
  );
}
