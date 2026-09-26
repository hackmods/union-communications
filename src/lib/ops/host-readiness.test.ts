import { describe, expect, it } from "vitest";
import type { HealthStatus } from "@/lib/ops/health-status";
import { buildHostReadiness } from "@/lib/ops/host-readiness";
import { listMemoryCaseDataBackendKeys } from "@/lib/db/backend";
import { memoryDatabaseBootAttestation } from "@/lib/ops/database-boot";

function allMemoryBackends(): HealthStatus["backends"] {
  return {
    GRIEVANCE_DB_BACKEND: "memory",
    BUMPING_DB_BACKEND: "memory",
    AUDIT_DB_BACKEND: "memory",
    TIME_DB_BACKEND: "memory",
    ATTACHMENTS_DB_BACKEND: "memory",
    DISCUSSIONS_DB_BACKEND: "memory",
    TASKS_DB_BACKEND: "memory",
    INFORMAL_LOG_DB_BACKEND: "memory",
    SNIPPETS_DB_BACKEND: "memory",
    MINUTES_DB_BACKEND: "memory",
    LEDGER_DB_BACKEND: "memory",
    OFFICERS_DB_BACKEND: "memory",
    TRAVEL_DB_BACKEND: "memory",
    EXPENSES_DB_BACKEND: "memory",
    COMMITTEES_DB_BACKEND: "memory",
    ELECTIONS_DB_BACKEND: "memory",
    POLLS_DB_BACKEND: "memory",
    MEETINGS_DB_BACKEND: "memory",
    MEETINGS_RSVP_DB_BACKEND: "memory",
    CHECKINS_DB_BACKEND: "memory",
    AUTH_USERS_BACKEND: "memory",
    FEEDBACK_DB_BACKEND: "memory",
    OFFICER_LEARNING_DB_BACKEND: "memory",
    PLATFORM_SETTINGS_DB_BACKEND: "memory",
    BYLAWS_DB_BACKEND: "memory",
    PROPOSALS_DB_BACKEND: "memory",
    DATA_DB_BACKEND: "memory",
    ACCESS_REQUEST_DB_BACKEND: "memory",
    PORTAL_DB_BACKEND: "memory",
  };
}

function baseHealth(overrides: Partial<HealthStatus> = {}): HealthStatus {
  return {
    status: "ok",
    version: "0.1.0",
    commit: "abc1234",
    builtAt: "2026-09-23T12:00:00Z",
    backends: allMemoryBackends(),
    postgresConfigured: false,
    memoryCaseDataActive: true,
    postgresFlipComplete: false,
    emailEnabled: false,
    accessRequestNotifyConfigured: false,
    cronConfigured: false,
    mfaEnabled: false,
    demoAuthEnabled: true,
    observability: {
      sentryEnabled: false,
      sentryClientEnabled: false,
      errorLogFileEnabled: false,
      sentryMisconfigured: false,
      errorLogFileMisconfigured: false,
      sentryClientServerMismatch: false,
    },
    databaseDeployment: memoryDatabaseBootAttestation(),
    tenantRegistry: { unionCount: null, seeded: null },
    ...overrides,
  };
}

const HUB_POSTGRES_KEYS = [
  "GRIEVANCE_DB_BACKEND",
  "BUMPING_DB_BACKEND",
  "AUDIT_DB_BACKEND",
  "TIME_DB_BACKEND",
  "ATTACHMENTS_DB_BACKEND",
  "DISCUSSIONS_DB_BACKEND",
  "TASKS_DB_BACKEND",
  "INFORMAL_LOG_DB_BACKEND",
  "SNIPPETS_DB_BACKEND",
  "MINUTES_DB_BACKEND",
  "LEDGER_DB_BACKEND",
  "OFFICERS_DB_BACKEND",
  "TRAVEL_DB_BACKEND",
  "EXPENSES_DB_BACKEND",
  "COMMITTEES_DB_BACKEND",
  "ELECTIONS_DB_BACKEND",
  "POLLS_DB_BACKEND",
  "MEETINGS_DB_BACKEND",
  "MEETINGS_RSVP_DB_BACKEND",
  "CHECKINS_DB_BACKEND",
  "AUTH_USERS_BACKEND",
  "FEEDBACK_DB_BACKEND",
  "OFFICER_LEARNING_DB_BACKEND",
  "PLATFORM_SETTINGS_DB_BACKEND",
  "BYLAWS_DB_BACKEND",
  "PROPOSALS_DB_BACKEND",
] as const;

describe("buildHostReadiness", () => {
  it("flags all postgres-recommended backends when host is memory-default", () => {
    const readiness = buildHostReadiness(baseHealth());
    expect(readiness.ready).toBe(false);
    expect(readiness.missingBackendFlips.map((r) => r.key)).toContain(
      "GRIEVANCE_DB_BACKEND",
    );
    expect(readiness.missingBackendFlips.map((r) => r.key)).toContain(
      "PORTAL_DB_BACKEND",
    );
    expect(readiness.missingBackendFlips.map((r) => r.key)).not.toContain(
      "DATA_DB_BACKEND",
    );
    expect(
      readiness.backends.find((r) => r.key === "DATA_DB_BACKEND"),
    ).toMatchObject({
      effective: "memory",
      intentionalMemory: true,
      ok: true,
    });
  });

  it("matches live Portal-memory shape: casework postgres, portal/access still memory", () => {
    const backends = allMemoryBackends();
    for (const key of HUB_POSTGRES_KEYS) {
      backends[key] = "postgres";
    }
    backends.DATA_DB_BACKEND = "memory";
    backends.ACCESS_REQUEST_DB_BACKEND = "memory";
    backends.PORTAL_DB_BACKEND = "memory";

    const readiness = buildHostReadiness(
      baseHealth({
        postgresConfigured: true,
        memoryCaseDataActive: true,
        postgresFlipComplete: false,
        emailEnabled: true,
        cronConfigured: false,
        mfaEnabled: false,
        demoAuthEnabled: false,
        backends,
        databaseDeployment: {
          version: 1,
          mode: "postgres",
          verified: true,
          verifiedAt: "2026-09-23T12:03:50.988Z",
          journalSchema: "drizzle",
          tailTag: "0055_membership_policy_uniqueness",
          tailIdx: 55,
          tailCreatedAt: 1790200000000,
          contractVersion: 1,
          tables: 120,
          columns: 1274,
          policies: 134,
        },
        tenantRegistry: { unionCount: 1, seeded: true },
      }),
    );

    expect(readiness.database.tailTag).toBe(
      "0055_membership_policy_uniqueness",
    );
    expect(readiness.missingBackendFlips.map((r) => r.key).sort()).toEqual([
      "ACCESS_REQUEST_DB_BACKEND",
      "PORTAL_DB_BACKEND",
    ]);
    expect(readiness.ready).toBe(false);
    expect(readiness.missingPresence.map((p) => p.id).sort()).toEqual([
      "accessRequestNotify",
      "cronConfigured",
      "mfaEnabled",
    ]);
    expect(readiness.missingAdvisoryPresence.map((p) => p.id).sort()).toEqual([
      "accessRequestNotify",
      "cronConfigured",
      "mfaEnabled",
    ]);
    expect(readiness.missingBlockingPresence).toEqual([]);
  });

  it("stays ready when MFA is off (advisory only)", () => {
    const backends = allMemoryBackends();
    for (const key of HUB_POSTGRES_KEYS) {
      backends[key] = "postgres";
    }
    backends.ACCESS_REQUEST_DB_BACKEND = "postgres";
    backends.PORTAL_DB_BACKEND = "postgres";
    backends.DATA_DB_BACKEND = "memory";

    const readiness = buildHostReadiness(
      baseHealth({
        status: "ok",
        postgresConfigured: true,
        memoryCaseDataActive: false,
        postgresFlipComplete: true,
        emailEnabled: false,
        cronConfigured: false,
        mfaEnabled: false,
        demoAuthEnabled: false,
        backends,
        databaseDeployment: {
          version: 1,
          mode: "postgres",
          verified: true,
          verifiedAt: "2026-09-23T12:03:50.988Z",
          journalSchema: "drizzle",
          tailTag: "0055_membership_policy_uniqueness",
          tailIdx: 55,
          tailCreatedAt: 1790200000000,
          contractVersion: 1,
          tables: 120,
          columns: 1274,
          policies: 134,
        },
        tenantRegistry: { unionCount: 1, seeded: true },
      }),
    );

    expect(readiness.ready).toBe(true);
    expect(readiness.missingAdvisoryPresence.map((p) => p.id).sort()).toEqual([
      "cronConfigured",
      "emailEnabled",
      "mfaEnabled",
    ]);
    expect(readiness.missingBlockingPresence).toEqual([]);
  });

  it("marks ready when flip complete and presence gates pass", () => {
    const backends = allMemoryBackends();
    for (const key of HUB_POSTGRES_KEYS) {
      backends[key] = "postgres";
    }
    backends.ACCESS_REQUEST_DB_BACKEND = "postgres";
    backends.PORTAL_DB_BACKEND = "postgres";
    backends.DATA_DB_BACKEND = "memory";

    const readiness = buildHostReadiness(
      baseHealth({
        status: "ok",
        postgresConfigured: true,
        memoryCaseDataActive: false,
        postgresFlipComplete: true,
        emailEnabled: true,
        accessRequestNotifyConfigured: true,
        cronConfigured: true,
        mfaEnabled: true,
        demoAuthEnabled: false,
        backends,
        databaseDeployment: {
          version: 1,
          mode: "postgres",
          verified: true,
          verifiedAt: "2026-09-23T12:03:50.988Z",
          journalSchema: "drizzle",
          tailTag: "0055_membership_policy_uniqueness",
          tailIdx: 55,
          tailCreatedAt: 1790200000000,
          contractVersion: 1,
          tables: 120,
          columns: 1274,
          policies: 134,
        },
        tenantRegistry: { unionCount: 1, seeded: true },
      }),
    );

    expect(readiness.missingBackendFlips).toEqual([]);
    expect(readiness.ready).toBe(true);
  });

  it("blocks ready when unions table is empty after migrate", () => {
    const backends = allMemoryBackends();
    for (const key of HUB_POSTGRES_KEYS) {
      backends[key] = "postgres";
    }
    backends.ACCESS_REQUEST_DB_BACKEND = "postgres";
    backends.PORTAL_DB_BACKEND = "postgres";
    backends.DATA_DB_BACKEND = "memory";

    const readiness = buildHostReadiness(
      baseHealth({
        status: "ok",
        postgresConfigured: true,
        memoryCaseDataActive: false,
        postgresFlipComplete: true,
        emailEnabled: true,
        cronConfigured: true,
        mfaEnabled: true,
        demoAuthEnabled: false,
        backends,
        databaseDeployment: {
          version: 1,
          mode: "postgres",
          verified: true,
          verifiedAt: "2026-09-23T12:03:50.988Z",
          journalSchema: "drizzle",
          tailTag: "0055_membership_policy_uniqueness",
          tailIdx: 55,
          tailCreatedAt: 1790200000000,
          contractVersion: 1,
          tables: 120,
          columns: 1274,
          policies: 134,
        },
        tenantRegistry: { unionCount: 0, seeded: false },
      }),
    );

    expect(readiness.ready).toBe(false);
    expect(readiness.missingBlockingPresence.map((p) => p.id)).toContain(
      "tenantsSeeded",
    );
  });
});

describe("listMemoryCaseDataBackendKeys", () => {
  it("lists only case-data keys still on memory", () => {
    const keys = listMemoryCaseDataBackendKeys({
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
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
      PORTAL_DB_BACKEND: "memory",
      DATA_DB_BACKEND: "memory",
      ACCESS_REQUEST_DB_BACKEND: "memory",
      AUDIT_DB_BACKEND: "postgres",
    });
    expect(keys).toEqual(["PORTAL_DB_BACKEND"]);
  });
});
