import * as Sentry from "@sentry/nextjs";
import { resolveObservabilityConfig } from "@/lib/observability/config";
import { warnObservabilityMisconfigOnce } from "@/lib/observability/boot-warn";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    warnObservabilityMisconfigOnce();
    void import("@/lib/ops/boot-notify").then((m) => {
      m.scheduleBootLifecycleNotify();
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Next.js onRequestError — optional Sentry when enabled; ObservabilityEventStore
 * on Node only (edge has no durable FS write path).
 */
export async function onRequestError(
  ...args: Parameters<typeof Sentry.captureRequestError>
) {
  const [error, request] = args;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportServerError } = await import(
      "@/lib/observability/report-server-error"
    );
    void reportServerError(error, {
      route: request.path,
      source: "server",
      captureSentry: false,
    });
  }

  if (resolveObservabilityConfig().sentryEnabled) {
    Sentry.captureRequestError(...args);
  }
}
