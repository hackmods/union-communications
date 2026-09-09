import * as Sentry from "@sentry/nextjs";
import { resolveObservabilityConfig } from "@/lib/observability/config";

const cfg = resolveObservabilityConfig();

Sentry.init({
  dsn: cfg.sentryDsn,
  enabled: cfg.sentryEnabled,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      delete event.request.headers;
    }
    return event;
  },
});
