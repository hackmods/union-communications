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

/**
 * Report a route-level React error boundary failure to Sentry (client SDK).
 *
 * Recognised-benign signals (`auth.credentials_failed`, `action.drift`) are
 * demoted to a breadcrumb / warning level so Sentry doesn't inflate them as
 * "Issues" — operators see them grouped under the `signal` tag instead.
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
}
