import { resolveObservabilityConfig } from "@/lib/observability/config";
import {
  classifyServerError,
  type Classification,
} from "@/lib/observability/signal-classify";
import { observabilityStore } from "@/lib/observability/store";
import type { ObservabilitySource } from "@/lib/observability/types";

export type ReportServerErrorOptions = {
  route?: string;
  /** When true, also Sentry.captureException if the SDK is enabled and loaded. */
  captureSentry?: boolean;
  source?: ObservabilitySource;
  requestId?: string;
  /** Optional Hub union stamp when known from session / API context. */
  unionId?: string | null;
  meta?: Record<string, string | number | boolean | null>;
};

/** Resolved image build commit (set by entrypoint.sh). Used as a tag. */
function currentBuild(): string | undefined {
  const raw = process.env.BUILD_COMMIT_SHA?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

function serializeError(error: unknown): {
  message: string;
  name?: string;
  stack?: string;
  digest?: string;
} {
  if (error instanceof Error) {
    const digest =
      "digest" in error && typeof (error as { digest?: unknown }).digest === "string"
        ? (error as { digest: string }).digest
        : undefined;
    return {
      message: error.message || error.name || "Error",
      name: error.name,
      stack: error.stack,
      digest,
    };
  }
  return { message: String(error) };
}

/**
 * Fan-out server errors to the ObservabilityEventStore and optionally Sentry.
 * Safe no-op when both sinks are off. Never throws.
 *
 * Recognised benign patterns (`auth.credentials_failed`, `action.drift`) are
 * demoted to `warn` / `info` so they don't dominate the operator's view.
 */
export async function reportServerError(
  error: unknown,
  options: ReportServerErrorOptions = {},
): Promise<void> {
  const {
    route,
    captureSentry = true,
    source = "server",
    requestId,
    unionId,
    meta,
  } = options;
  const build = currentBuild();
  const parts = serializeError(error);
  const classification: Classification = classifyServerError(error);

  try {
    await observabilityStore.append({
      level: classification.level,
      source,
      message: parts.message,
      name: parts.name,
      stack: parts.stack,
      digest: parts.digest,
      route,
      build,
      signal: classification.signal,
      requestId,
      unionId: unionId || null,
      meta: meta ?? undefined,
    });
  } catch {
    // store append should never throw; belt-and-suspenders
  }

  if (!captureSentry) return;

  const cfg = resolveObservabilityConfig();
  if (!cfg.sentryEnabled) return;

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.withScope((scope) => {
      if (build) scope.setTag("build", build);
      if (classification.signal) scope.setTag("signal", classification.signal);
      if (route) scope.setTag("route", route);
      if (classification.level === "info") {
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
  options?: Omit<ReportServerErrorOptions, "route">,
): void {
  void reportServerError(
    error instanceof Error ? error : new Error(String(error)),
    { route, ...options },
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
