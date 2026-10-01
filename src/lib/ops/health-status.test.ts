import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildHealthStatus,
  readAppVersion,
} from "@/lib/ops/health-status";

describe("buildHealthStatus", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env };
    process.env.DB_BOOT_ATTESTATION_PATH = `${process.cwd()}/.missing-db-boot-test.json`;
    delete process.env.UNIONOPS_HOSTED_CUSTOMER_MODE;
    delete process.env.DATABASE_URL;
    delete process.env.OBSERVABILITY_BACKEND;
    delete process.env.ERROR_LOG_FILE_ENABLED;
    delete process.env.ERROR_LOG_FILE_PATH;
    delete process.env.SENTRY_ENABLED;
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    for (const key of [
      "ATTACHMENT_STORAGE",
      "ATTACHMENT_LOCAL_DIR",
      "ATTACHMENT_S3_BUCKET",
      "ATTACHMENT_S3_REGION",
      "ATTACHMENT_S3_ACCESS_KEY_ID",
      "ATTACHMENT_S3_SECRET_ACCESS_KEY",
      "ATTACHMENT_S3_SSE",
      "ATTACHMENT_SCANNER_URL",
      "ATTACHMENT_SCAN_MODE",
      "ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR",
      "UNIONOPS_ATTACHMENT_STORAGE_APPROVED",
      "UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_AT",
      "UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_BY",
      "UNIONOPS_ATTACHMENT_SCAN_TESTED_AT",
      "UNIONOPS_ATTACHMENT_SCAN_TESTED_BY",
      "UNIONOPS_BACKUP_CONFIGURED",
      "UNIONOPS_BACKUP_RESTORE_TESTED_AT",
      "UNIONOPS_BACKUP_OWNER",
      "UNIONOPS_ALERTS_CONFIGURED",
      "UNIONOPS_ALERT_DELIVERY_TESTED_AT",
      "UNIONOPS_ALERT_OWNER",
      "UNIONOPS_LEGAL_ENTITY_NAME",
      "UNIONOPS_PRIVACY_OFFICER_NAME",
      "UNIONOPS_PRIVACY_EMAIL",
      "UNIONOPS_PRIVACY_MAILING_ADDRESS",
      "UNIONOPS_SECURITY_EMAIL",
      "UNIONOPS_ACCESSIBILITY_EMAIL",
      "UNIONOPS_PUBLIC_CONTACTS_MONITORED_AT",
      "UNIONOPS_PUBLIC_CONTACTS_MONITORED_BY",
    ]) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = env;
  });

  it("returns ok with commit and default memory backends", async () => {
    delete process.env.BUILD_COMMIT_SHA;
    delete process.env.BUILD_TIME;
    delete process.env.GRIEVANCE_DB_BACKEND;
    const status = await buildHealthStatus();
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
    expect(status.mfaMode).toBeNull();
    expect(status.totpEncryptionConfigured).toBe(false);
    expect(status.hostedCustomerMode).toBe(false);
    expect(status.hostedControlEvidence).toEqual({
      attachmentStorageApproved: false,
      attachmentStorageGaps: [
        "approved_flag",
        "review_date_or_owner",
        "storage_config",
      ],
      strictUploadScan: false,
      strictUploadScanGaps: ["scanner_url", "scanner_mode", "review_date_or_owner"],
      backupRestoreEvidence: false,
      backupRestoreGaps: ["configured_flag", "review_date_or_owner"],
      alertDeliveryEvidence: false,
      alertDeliveryGaps: ["configured_flag", "review_date_or_owner"],
      publicLegalContacts: false,
      publicLegalContactsGaps: ["contacts_incomplete", "contacts_monitoring"],
    });
    expect(typeof status.demoAuthEnabled).toBe("boolean");
    expect(status.tenantRegistry).toEqual({ unionCount: null, seeded: null });
    expect(status.observability).toEqual({
      backend: "noop",
      storeEnabled: false,
      fileDualWrite: false,
      sentryEnabled: false,
      sentryClientEnabled: false,
      errorLogFileEnabled: false,
      sentryMisconfigured: false,
      errorLogFileMisconfigured: false,
      sentryClientServerMismatch: false,
    });
    expect(status.databaseDeployment).toMatchObject({
      mode: "memory",
      verified: false,
    });
  });

  it("reads app version from package.json", () => {
    expect(readAppVersion()).toBe("0.1.0");
  });

  it("reflects configured commit and postgres flags", async () => {
    process.env.BUILD_COMMIT_SHA = "abc1234";
    process.env.BUILD_TIME = "2026-08-27T12:00:00Z";
    process.env.GRIEVANCE_DB_BACKEND = "postgres";
    process.env.DATABASE_URL = "postgres://unionops:secret@localhost:5432/unionops";
    process.env.EMAIL_ENABLED = "true";
    process.env.CRON_SECRET = "cron-test";
    process.env.AUTH_MFA_ENABLED = "true";
    const status = await buildHealthStatus();
    expect(status.commit).toBe("abc1234");
    expect(status.builtAt).toBe("2026-08-27T12:00:00Z");
    expect(status.backends.GRIEVANCE_DB_BACKEND).toBe("postgres");
    expect(status.postgresConfigured).toBe(true);
    expect(status.status).toBe("degraded");
    expect(status.databaseDeployment).toMatchObject({
      mode: "unknown",
      verified: false,
    });
    expect(status.memoryCaseDataActive).toBe(true);
    expect(status.postgresFlipComplete).toBe(false);
    expect(status.emailEnabled).toBe(true);
    expect(status.cronConfigured).toBe(true);
    expect(status.mfaEnabled).toBe(true);
    expect(status.totpEncryptionConfigured).toBe(false);
  });

  it("reflects observability sink flags without leaking DSN", async () => {
    process.env.SENTRY_ENABLED = "true";
    process.env.SENTRY_DSN = "https://leaked-secret@o0.ingest.sentry.io/9";
    process.env.ERROR_LOG_FILE_ENABLED = "true";
    process.env.ERROR_LOG_FILE_PATH = "/data/logs/unionops-errors.jsonl";
    const status = await buildHealthStatus();
    expect(status.observability.sentryEnabled).toBe(true);
    expect(status.observability.sentryClientEnabled).toBe(false);
    expect(status.observability.sentryClientServerMismatch).toBe(true);
    expect(status.observability.errorLogFileEnabled).toBe(true);
    expect(status.observability.storeEnabled).toBe(true);
    expect(status.observability.backend).toBe("file");
    expect(JSON.stringify(status)).not.toContain("leaked-secret");
  });

  it("reports hosted customer MFA as enabled even when the legacy switch is off", async () => {
    const totpKey = Buffer.alloc(32, 7).toString("base64");
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.UNIONOPS_HOSTED_CUSTOMER_MODE = "true";
    process.env.AUTH_MFA_ENABLED = "false";
    process.env.AUTH_MFA_MODE = "totp";
    process.env.AUTH_TOTP_ENCRYPTION_KEY = totpKey;
    const status = await buildHealthStatus();
    expect(status.hostedCustomerMode).toBe(true);
    expect(status.mfaEnabled).toBe(true);
    expect(status.mfaMode).toBe("totp");
    expect(status.totpEncryptionConfigured).toBe(true);
    expect(status.mfaOperatorBypassConfigured).toBe(false);
    expect(status.mfaDurableFallbackRecent).toBe(false);
    expect(JSON.stringify(status)).not.toContain(totpKey);
  });

  it("reports operator MFA bypass as configured without echoing emails", async () => {
    process.env.AUTH_MFA_OPERATOR_BYPASS_EMAILS = "ryan@ryanmorris.ca";
    const status = await buildHealthStatus();
    expect(status.mfaOperatorBypassConfigured).toBe(true);
    expect(JSON.stringify(status)).not.toContain("ryan@ryanmorris.ca");
  });

  it("reports recent MFA durable memory fallback without secrets", async () => {
    const { noteMfaDurableFallback, resetMfaDurableFallbackSignalForTests } =
      await import("@/lib/auth/mfa-durable-fallback-signal");
    resetMfaDurableFallbackSignalForTests();
    noteMfaDurableFallback("attempt_limit");
    const status = await buildHealthStatus();
    expect(status.mfaDurableFallbackRecent).toBe(true);
    expect(JSON.stringify(status)).not.toMatch(/attempt_limit|Wed |GMT/);
    resetMfaDurableFallbackSignalForTests();
  });
});
