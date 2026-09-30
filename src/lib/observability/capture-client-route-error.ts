"use client";

import * as Sentry from "@sentry/nextjs";
import { classifyServerError } from "@/lib/observability/signal-classify";

/**
 * Recognised-benign client error signals — these typically fire across
 * a deploy window when a stale-tab user submits a server action whose
 * per-build ID has been replaced. The boundary returns a soft-reload
 * panel for these instead of the heavy error UI.
 */
export type ClientErrorSignal = ReturnType<typeof classifyServerError>["signal"];

/** True when the boundary should render a soft-reload instead of full error UI. */
export function isClientActionDrift(error: Error & { digest?: string }): boolean {
  return classifyServerError(error).signal === "action.drift";
}

function postToOperatorStore(
  error: Error & { digest?: string },
  source: string,
): void {
  const payload = JSON.stringify({
    message: error.message || error.name || "Error",
    name: error.name,
    stack: typeof error.stack === "string" ? error.stack.slice(0, 8_000) : undefined,
    digest: error.digest,
    source,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      const queued = navigator.sendBeacon("/api/observability/client-errors", blob);
      if (queued) return;
    }
  } catch {
    /* fall through to fetch */
  }

  try {
    void fetch("/api/observability/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    /* never break the error boundary */
  }
}

/**
 * Report a route-level React error boundary failure.
 * Always posts a sanitized payload to the operator store (Sentry-free primary).
 * Optionally also sends to Sentry when the client SDK has a DSN.
 */
export function captureClientRouteError(
  error: Error & { digest?: string },
  source: string,
): void {
  const classification = classifyServerError(error);
  console.error(
    `[${source}]`,
    error.digest ?? error.message,
    classification.signal ? `signal=${classification.signal}` : "",
  );

  postToOperatorStore(error, source);

  // Optional Sentry fan-out — no-op when NEXT_PUBLIC_SENTRY_DSN is unset.
  try {
    const dsn =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
        : undefined;
    if (!dsn) return;

    Sentry.withScope((scope) => {
      if (classification.signal) {
        scope.setTag("signal", classification.signal);
      }
      scope.setTag("route_source", source);
      if (classification.level === "info") {
        scope.setLevel("info");
        Sentry.captureMessage(error.message || error.name || "Error", "info");
        return;
      }
      if (classification.level === "warn") {
        scope.setLevel("warning");
        Sentry.captureMessage(error.message || error.name || "Error", "warning");
        return;
      }
      Sentry.captureException(error);
    });
  } catch {
    /* SDK missing — ignore */
  }
}
