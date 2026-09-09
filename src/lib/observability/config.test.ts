import { afterEach, describe, expect, it } from "vitest";
import {
  buildObservabilityHealth,
  errorLogFileMisconfigured,
  resolveObservabilityConfig,
} from "@/lib/observability/config";

const KEYS = [
  "SENTRY_ENABLED",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_DSN",
  "ERROR_LOG_FILE_ENABLED",
  "ERROR_LOG_FILE_PATH",
  "ERROR_LOG_FILE_MAX_BYTES",
  "ERROR_LOG_FILE_KEEP",
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
    expect(cfg.sentryMisconfigured).toBe(false);
    expect(cfg.sentryClientServerMismatch).toBe(false);
    expect(cfg.errorLogFileMisconfigured).toBe(false);
    expect(cfg.errorLogFileMaxBytes).toBe(10 * 1024 * 1024);
    expect(cfg.errorLogFileKeep).toBe(3);
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

  it("flags sentryMisconfigured when enabled without DSN", () => {
    expect(
      resolveObservabilityConfig({ SENTRY_ENABLED: "true" }).sentryMisconfigured,
    ).toBe(true);
  });

  it("flags client/server mismatch when server on without public DSN", () => {
    const cfg = resolveObservabilityConfig({
      SENTRY_ENABLED: "true",
      SENTRY_DSN: "https://private@o0.ingest.sentry.io/2",
    });
    expect(cfg.sentryEnabled).toBe(true);
    expect(cfg.sentryClientEnabled).toBe(false);
    expect(cfg.sentryClientServerMismatch).toBe(true);
  });

  it("prefers SENTRY_DSN over public DSN on server", () => {
    const cfg = resolveObservabilityConfig({
      SENTRY_ENABLED: "true",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@o0.ingest.sentry.io/1",
      SENTRY_DSN: "https://private@o0.ingest.sentry.io/2",
    });
    expect(cfg.sentryDsn).toBe("https://private@o0.ingest.sentry.io/2");
    expect(cfg.sentryClientEnabled).toBe(true);
    expect(cfg.sentryClientServerMismatch).toBe(false);
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
      ERROR_LOG_FILE_MAX_BYTES: "1024",
      ERROR_LOG_FILE_KEEP: "5",
    });
    expect(cfg.errorLogFileEnabled).toBe(true);
    expect(cfg.errorLogFilePath).toBe("/data/logs/errors.jsonl");
    expect(cfg.errorLogFileMaxBytes).toBe(1024);
    expect(cfg.errorLogFileKeep).toBe(5);
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

describe("buildObservabilityHealth", () => {
  it("exposes non-secret flags only", () => {
    const health = buildObservabilityHealth({
      SENTRY_ENABLED: "true",
      SENTRY_DSN: "https://secret@o0.ingest.sentry.io/1",
      ERROR_LOG_FILE_ENABLED: "true",
      ERROR_LOG_FILE_PATH: "/data/logs/x.jsonl",
    });
    expect(health).toEqual({
      sentryEnabled: true,
      sentryClientEnabled: false,
      errorLogFileEnabled: true,
      sentryMisconfigured: false,
      errorLogFileMisconfigured: false,
      sentryClientServerMismatch: true,
    });
    expect(JSON.stringify(health)).not.toContain("secret");
  });
});
