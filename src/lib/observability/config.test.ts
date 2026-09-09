import { afterEach, describe, expect, it } from "vitest";
import {
  errorLogFileMisconfigured,
  resolveObservabilityConfig,
} from "@/lib/observability/config";

const KEYS = [
  "SENTRY_ENABLED",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_DSN",
  "ERROR_LOG_FILE_ENABLED",
  "ERROR_LOG_FILE_PATH",
] as const;

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
});

describe("resolveObservabilityConfig", () => {
  it("defaults both sinks off", () => {
    const cfg = resolveObservabilityConfig({});
    expect(cfg.sentryEnabled).toBe(false);
    expect(cfg.sentryClientEnabled).toBe(false);
    expect(cfg.errorLogFileEnabled).toBe(false);
  });

  it("enables Sentry only when flag and DSN are set", () => {
    expect(
      resolveObservabilityConfig({
        SENTRY_ENABLED: "true",
      }).sentryEnabled,
    ).toBe(false);

    expect(
      resolveObservabilityConfig({
        SENTRY_ENABLED: "true",
        NEXT_PUBLIC_SENTRY_DSN: "https://key@o0.ingest.sentry.io/1",
      }).sentryEnabled,
    ).toBe(true);
  });

  it("prefers SENTRY_DSN over public DSN on server", () => {
    const cfg = resolveObservabilityConfig({
      SENTRY_ENABLED: "true",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@o0.ingest.sentry.io/1",
      SENTRY_DSN: "https://private@o0.ingest.sentry.io/2",
    });
    expect(cfg.sentryDsn).toBe("https://private@o0.ingest.sentry.io/2");
    expect(cfg.sentryClientEnabled).toBe(true);
  });

  it("enables client when public DSN is present regardless of server flag", () => {
    const cfg = resolveObservabilityConfig({
      SENTRY_ENABLED: "false",
      NEXT_PUBLIC_SENTRY_DSN: "https://key@o0.ingest.sentry.io/1",
    });
    expect(cfg.sentryEnabled).toBe(false);
    expect(cfg.sentryClientEnabled).toBe(true);
  });

  it("enables file log only with flag and path", () => {
    expect(
      resolveObservabilityConfig({
        ERROR_LOG_FILE_ENABLED: "true",
      }).errorLogFileEnabled,
    ).toBe(false);

    const cfg = resolveObservabilityConfig({
      ERROR_LOG_FILE_ENABLED: "yes",
      ERROR_LOG_FILE_PATH: "/data/logs/errors.jsonl",
    });
    expect(cfg.errorLogFileEnabled).toBe(true);
    expect(cfg.errorLogFilePath).toBe("/data/logs/errors.jsonl");
  });
});

describe("errorLogFileMisconfigured", () => {
  it("detects enabled without path", () => {
    expect(errorLogFileMisconfigured({ ERROR_LOG_FILE_ENABLED: "true" })).toBe(
      true,
    );
    expect(
      errorLogFileMisconfigured({
        ERROR_LOG_FILE_ENABLED: "true",
        ERROR_LOG_FILE_PATH: "/tmp/x.jsonl",
      }),
    ).toBe(false);
  });
});
