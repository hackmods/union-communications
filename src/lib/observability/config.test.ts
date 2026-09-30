import { afterEach, describe, expect, it } from "vitest";
import {
  buildObservabilityHealth,
  errorLogFileMisconfigured,
  resolveObservabilityBackend,
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
  "OBSERVABILITY_BACKEND",
  "DATABASE_URL",
] as const;

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
});

describe("resolveObservabilityBackend", () => {
  it("auto-selects postgres when DATABASE_URL is set", () => {
    expect(
      resolveObservabilityBackend({
        DATABASE_URL: "postgres://u:p@localhost/db",
      }),
    ).toBe("postgres");
  });

  it("uses file when no DATABASE_URL but file sink on", () => {
    expect(
      resolveObservabilityBackend({
        ERROR_LOG_FILE_ENABLED: "true",
        ERROR_LOG_FILE_PATH: "/data/logs/x.jsonl",
      }),
    ).toBe("file");
  });

  it("respects explicit noop", () => {
    expect(
      resolveObservabilityBackend({
        OBSERVABILITY_BACKEND: "noop",
        DATABASE_URL: "postgres://u:p@localhost/db",
      }),
    ).toBe("noop");
  });
});

describe("resolveObservabilityConfig", () => {
  it("defaults both sinks off", () => {
    const cfg = resolveObservabilityConfig({});
    expect(cfg.sentryEnabled).toBe(false);
    expect(cfg.errorLogFileEnabled).toBe(false);
    expect(cfg.backend).toBe("noop");
    expect(cfg.fileDualWrite).toBe(false);
  });

  it("enables file dual-write when postgres primary and file on", () => {
    const cfg = resolveObservabilityConfig({
      DATABASE_URL: "postgres://u:p@localhost/db",
      ERROR_LOG_FILE_ENABLED: "true",
      ERROR_LOG_FILE_PATH: "/data/logs/x.jsonl",
    });
    expect(cfg.backend).toBe("postgres");
    expect(cfg.fileDualWrite).toBe(true);
  });

  it("enables file log only with flag and path", () => {
    const cfg = resolveObservabilityConfig({
      ERROR_LOG_FILE_ENABLED: "yes",
      ERROR_LOG_FILE_PATH: "/data/logs/errors.jsonl",
      ERROR_LOG_FILE_MAX_BYTES: "1024",
      ERROR_LOG_FILE_KEEP: "5",
    });
    expect(cfg.errorLogFileEnabled).toBe(true);
    expect(cfg.backend).toBe("file");
    expect(cfg.errorLogFileKeep).toBe(5);
  });
});

describe("errorLogFileMisconfigured", () => {
  it("detects enabled without path", () => {
    expect(errorLogFileMisconfigured({ ERROR_LOG_FILE_ENABLED: "true" })).toBe(
      true,
    );
  });
});

describe("buildObservabilityHealth", () => {
  it("exposes postgres store without leaking DSN", () => {
    const health = buildObservabilityHealth({
      DATABASE_URL: "postgres://secret@localhost/db",
      SENTRY_ENABLED: "true",
      SENTRY_DSN: "https://secret@o0.ingest.sentry.io/1",
    });
    expect(health).toEqual({
      backend: "postgres",
      storeEnabled: true,
      fileDualWrite: false,
      sentryEnabled: true,
      sentryClientEnabled: false,
      errorLogFileEnabled: false,
      sentryMisconfigured: false,
      errorLogFileMisconfigured: false,
      sentryClientServerMismatch: true,
    });
    expect(JSON.stringify(health)).not.toContain("secret");
  });

  it("exposes file store when no database", () => {
    const health = buildObservabilityHealth({
      ERROR_LOG_FILE_ENABLED: "true",
      ERROR_LOG_FILE_PATH: "/data/logs/x.jsonl",
    });
    expect(health.backend).toBe("file");
    expect(health.storeEnabled).toBe(true);
  });
});
