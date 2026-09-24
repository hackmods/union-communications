import { describe, expect, it } from "vitest";
import {
  buildDeployNotifyPayload,
  isDeployNotifyEnabled,
  readDeployNotifyEmail,
} from "@/lib/ops/deploy-notify";
import type { HealthStatus } from "@/lib/ops/health-status";
import { memoryDatabaseBootAttestation } from "@/lib/ops/database-boot";

function sampleHealth(overrides: Partial<HealthStatus> = {}): HealthStatus {
  return {
    status: "ok",
    version: "0.1.0",
    commit: "abcdef1234567890",
    builtAt: "2026-09-24T00:00:00Z",
    backends: {
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "postgres",
      ATTACHMENTS_DB_BACKEND: "postgres",
      DISCUSSIONS_DB_BACKEND: "postgres",
      TASKS_DB_BACKEND: "postgres",
      INFORMAL_LOG_DB_BACKEND: "postgres",
      SNIPPETS_DB_BACKEND: "postgres",
      MINUTES_DB_BACKEND: "postgres",
      LEDGER_DB_BACKEND: "postgres",
      OFFICERS_DB_BACKEND: "postgres",
      TRAVEL_DB_BACKEND: "postgres",
      EXPENSES_DB_BACKEND: "postgres",
      COMMITTEES_DB_BACKEND: "postgres",
      ELECTIONS_DB_BACKEND: "postgres",
      POLLS_DB_BACKEND: "postgres",
      MEETINGS_DB_BACKEND: "postgres",
      MEETINGS_RSVP_DB_BACKEND: "postgres",
      CHECKINS_DB_BACKEND: "postgres",
      AUTH_USERS_BACKEND: "postgres",
      FEEDBACK_DB_BACKEND: "postgres",
      OFFICER_LEARNING_DB_BACKEND: "postgres",
      PLATFORM_SETTINGS_DB_BACKEND: "postgres",
      BYLAWS_DB_BACKEND: "postgres",
      PROPOSALS_DB_BACKEND: "postgres",
      DATA_DB_BACKEND: "memory",
      ACCESS_REQUEST_DB_BACKEND: "postgres",
      PORTAL_DB_BACKEND: "postgres",
    },
    postgresConfigured: true,
    memoryCaseDataActive: false,
    postgresFlipComplete: true,
    emailEnabled: true,
    cronConfigured: false,
    mfaEnabled: false,
    demoAuthEnabled: false,
    observability: {
      sentryEnabled: false,
      sentryClientEnabled: false,
      errorLogFileEnabled: false,
      sentryMisconfigured: false,
      errorLogFileMisconfigured: false,
      sentryClientServerMismatch: false,
    },
    databaseDeployment: {
      ...memoryDatabaseBootAttestation(),
      mode: "postgres",
      verified: true,
      verifiedAt: "2026-09-24T00:00:00Z",
      tailTag: "0059_ca_snippet_libraries",
      tailIdx: 59,
      tables: 100,
      columns: 1000,
      policies: 100,
    },
    ...overrides,
  };
}

describe("deploy-notify", () => {
  it("reads env gates", () => {
    expect(isDeployNotifyEnabled({})).toBe(false);
    expect(isDeployNotifyEnabled({ DEPLOY_NOTIFY_ENABLED: "true" })).toBe(true);
    expect(readDeployNotifyEmail({ DEPLOY_NOTIFY_EMAIL: " ops@example.ca " })).toBe(
      "ops@example.ca",
    );
  });

  it("builds a payload that stays ready when MFA is off", () => {
    const payload = buildDeployNotifyPayload(sampleHealth({ mfaEnabled: false }));
    expect(payload.ready).toBe(true);
    expect(payload.subject).toContain("ready");
    expect(payload.text).toContain("Advisory");
    expect(payload.text).toContain("mfaEnabled");
    expect(payload.text).toContain("MFA does not block casework");
  });
});
