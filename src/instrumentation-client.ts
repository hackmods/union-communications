import * as Sentry from "@sentry/nextjs";
import { resolveObservabilityConfig } from "@/lib/observability/config";
import { installGlobalClientErrorHandlers } from "@/lib/observability/capture-client-route-error";

const cfg = resolveObservabilityConfig();

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: cfg.sentryClientEnabled,
  tracesSampleRate: 0,
});

// Always install operator-store handlers (Sentry-free primary path).
installGlobalClientErrorHandlers();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
