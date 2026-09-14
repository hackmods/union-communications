"use client";

import * as Sentry from "@sentry/nextjs";

/** Report a route-level React error boundary failure to Sentry (client SDK). */
export function captureClientRouteError(
  error: Error & { digest?: string },
  source: string,
): void {
  console.error(`[${source}]`, error.digest ?? error.message);
  Sentry.captureException(error);
}
