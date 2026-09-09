import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { buildHealthStatus, readAppVersion } from "@/lib/ops/health-status";

describe("buildHealthStatus", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("returns ok with commit and default memory backends", () => {
    delete process.env.BUILD_COMMIT_SHA;
    delete process.env.BUILD_TIME;
    delete process.env.GRIEVANCE_DB_BACKEND;
    const status = buildHealthStatus();
    expect(status.status).toBe("ok");
    expect(status.version).toBe("0.1.0");
    expect(status.commit).toBe("unknown");
    expect(status.builtAt).toBe("unknown");
    expect(status.backends.GRIEVANCE_DB_BACKEND).toBe("memory");
    expect(status.postgresConfigured).toBe(false);
    expect(status.memoryCaseDataActive).toBe(true);
    expect(status.postgresFlipComplete).toBe(false);
    expect(status.emailEnabled).toBe(false);
    expect(status.cronConfigured).toBe(false);
    expect(status.mfaEnabled).toBe(false);
    expect(typeof status.demoAuthEnabled).toBe("boolean");
    expect(status.observability).toEqual({
      sentryEnabled: false,
      sentryClientEnabled: false,
      errorLogFileEnabled: false,
      sentryMisconfigured: false,
      errorLogFileMisconfigured: false,
      sentryClientServerMismatch: false,
    });
  });

  it("reads app version from package.json", () => {
    expect(readAppVersion()).toBe("0.1.0");
  });

  it("reflects configured commit and postgres flags", () => {
    process.env.BUILD_COMMIT_SHA = "abc1234";
    process.env.BUILD_TIME = "2026-08-27T12:00:00Z";
    process.env.GRIEVANCE_DB_BACKEND = "postgres";
    process.env.DATABASE_URL = "postgres://unionops:secret@localhost:5432/unionops";
    process.env.EMAIL_ENABLED = "true";
    process.env.CRON_SECRET = "cron-test";
    process.env.AUTH_MFA_ENABLED = "true";
    const status = buildHealthStatus();
    expect(status.commit).toBe("abc1234");
    expect(status.builtAt).toBe("2026-08-27T12:00:00Z");
    expect(status.backends.GRIEVANCE_DB_BACKEND).toBe("postgres");
    expect(status.postgresConfigured).toBe(true);
    expect(status.memoryCaseDataActive).toBe(true);
    expect(status.postgresFlipComplete).toBe(false);
    expect(status.emailEnabled).toBe(true);
    expect(status.cronConfigured).toBe(true);
    expect(status.mfaEnabled).toBe(true);
  });

  it("reflects observability sink flags without leaking DSN", () => {
    process.env.SENTRY_ENABLED = "true";
    process.env.SENTRY_DSN = "https://leaked-secret@o0.ingest.sentry.io/9";
    process.env.ERROR_LOG_FILE_ENABLED = "true";
    process.env.ERROR_LOG_FILE_PATH = "/data/logs/unionops-errors.jsonl";
    const status = buildHealthStatus();
    expect(status.observability.sentryEnabled).toBe(true);
    expect(status.observability.sentryClientEnabled).toBe(false);
    expect(status.observability.sentryClientServerMismatch).toBe(true);
    expect(status.observability.errorLogFileEnabled).toBe(true);
    expect(JSON.stringify(status)).not.toContain("leaked-secret");
  });
});
