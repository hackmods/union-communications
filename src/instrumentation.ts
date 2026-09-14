import * as Sentry from "@sentry/nextjs";
import { resolveObservabilityConfig } from "@/lib/observability/config";
import { warnObservabilityMisconfigOnce } from "@/lib/observability/boot-warn";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    warnObservabilityMisconfigOnce();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Next.js onRequestError — Sentry when enabled; JSONL file sink on Node only
 * (edge has no durable FS write path).
 */
export async function onRequestError(
  ...args: Parameters<typeof Sentry.captureRequestError>
) {
  const [error, request] = args;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { appendServerErrorLog } = await import(
      "@/lib/observability/file-log"
    );
    void appendServerErrorLog(error, { route: request.path });
  }

  if (resolveObservabilityConfig().sentryEnabled) {
    Sentry.captureRequestError(...args);
  }
}
