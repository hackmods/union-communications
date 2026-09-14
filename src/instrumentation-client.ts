import * as Sentry from "@sentry/nextjs";
import { resolveObservabilityConfig } from "@/lib/observability/config";

const cfg = resolveObservabilityConfig();

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: cfg.sentryClientEnabled,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
