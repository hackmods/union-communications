import { resolveObservabilityConfig } from "@/lib/observability/config";
import { appendServerErrorLog } from "@/lib/observability/file-log";
import {
  classifyServerError,
  type Classification,
} from "@/lib/observability/signal-classify";

export type ReportServerErrorOptions = {
  route?: string;
  /** When true, also Sentry.captureException if the SDK is enabled and loaded. */
  captureSentry?: boolean;
};

/** Resolved image build commit (set by entrypoint.sh). Used as a Sentry tag. */
function currentBuild(): string | undefined {
  const raw = process.env.BUILD_COMMIT_SHA?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

/**
 * Fan-out server errors to the file sink and optionally Sentry.
 * Safe no-op when both sinks are off. Never throws.
 *
 * Recognised benign patterns (`auth.credentials_failed`, `action.drift`) are
 * demoted to `warn` / `info` capture levels so they don't dominate the
 * operator's view. The JSONL record carries the same `signal` field so
 * dashboards can group across deploys and SSH-tail together.
 */
export async function reportServerError(
  error: unknown,
  options: ReportServerErrorOptions = {},
): Promise<void> {
  const { route, captureSentry = true } = options;
  const build = currentBuild();

  try {
    await appendServerErrorLog(error, route ? { route, build } : { build });
  } catch {
    // appendServerErrorLog already swallows; belt-and-suspenders
  }

  if (!captureSentry) return;

  const cfg = resolveObservabilityConfig();
  if (!cfg.sentryEnabled) return;

  const classification: Classification = classifyServerError(error);
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.withScope((scope) => {
      if (build) scope.setTag("build", build);
      if (classification.signal) scope.setTag("signal", classification.signal);
      if (route) scope.setTag("route", route);
      if (classification.level === "info") {
        // Demote recognised-benign noise out of Sentry's "Issues" inbox —
        // visible as breadcrumbs instead of error events.
        scope.setLevel("info");
        Sentry.captureMessage(messageOf(error), "info");
        return;
      }
      if (classification.level === "warn") {
        scope.setLevel("warning");
        Sentry.captureMessage(messageOf(error), "warning");
        return;
      }
      Sentry.captureException(error);
    });
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

function messageOf(errorLike: unknown): string {
  if (errorLike instanceof Error) {
    return typeof errorLike.message === "string" && errorLike.message.length
      ? errorLike.message
      : (errorLike.name ?? "Error");
  }
  if (typeof errorLike === "string" && errorLike.length) return errorLike;
  try {
    return String(errorLike);
  } catch {
    return "Error";
  }
}
