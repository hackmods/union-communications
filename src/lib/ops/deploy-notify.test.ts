import { afterEach, describe, expect, it } from "vitest";
import {
  buildDeployNotifyPayload,
  isDeployNotifyEnabled,
  readDeployNotifyEmail,
} from "@/lib/ops/deploy-notify";
import { GET as deployNotifyGet, POST as deployNotifyPost } from "@/app/api/cron/deploy-notify/route";
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
    accessRequestNotifyConfigured: true,
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
    tenantRegistry: { unionCount: 1, seeded: true },
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

  it("builds a payload that stays ready when MFA is off", async () => {
    const payload = await buildDeployNotifyPayload(
      sampleHealth({ mfaEnabled: false }),
    );
    expect(payload.ready).toBe(true);
    expect(payload.subject).toContain("ready");
    expect(payload.text).toContain("Advisory");
    expect(payload.text).toContain("mfaEnabled");
    expect(payload.text).toContain("MFA does not block casework");
  });
});

describe("GET/POST /api/cron/deploy-notify", () => {
  const previousSecret = process.env.CRON_SECRET;
  const previousEnabled = process.env.DEPLOY_NOTIFY_ENABLED;

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
    if (previousEnabled === undefined) delete process.env.DEPLOY_NOTIFY_ENABLED;
    else process.env.DEPLOY_NOTIFY_ENABLED = previousEnabled;
  });

  it("returns 401 without the cron secret and dry-runs when authorized", async () => {
    process.env.CRON_SECRET = "test-deploy-notify-secret";

    const denied = await deployNotifyGet(
      new Request("http://localhost/api/cron/deploy-notify?dryRun=1"),
    );
    expect(denied.status).toBe(401);

    const wrong = await deployNotifyPost(
      new Request("http://localhost/api/cron/deploy-notify?dryRun=1", {
        headers: { authorization: "Bearer nope" },
      }),
    );
    expect(wrong.status).toBe(401);

    const ok = await deployNotifyGet(
      new Request("http://localhost/api/cron/deploy-notify?dryRun=1", {
        headers: { "x-cron-secret": "test-deploy-notify-secret" },
      }),
    );
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as {
      ok: boolean;
      dryRun: boolean;
      enabled: boolean;
      commit?: string;
    };
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(typeof body.enabled).toBe("boolean");
    expect(body.commit).toBeTruthy();
  });

  it("returns 200 skipped=disabled when notify is off and the secret matches", async () => {
    process.env.CRON_SECRET = "test-deploy-notify-secret";
    delete process.env.DEPLOY_NOTIFY_ENABLED;

    const res = await deployNotifyPost(
      new Request("http://localhost/api/cron/deploy-notify", {
        headers: { authorization: "Bearer test-deploy-notify-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; skipped?: string };
    expect(body.ok).toBe(false);
    expect(body.skipped).toBe("disabled");
  });
});
