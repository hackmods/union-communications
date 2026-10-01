import { describe, expect, it } from "vitest";
import type { HealthStatus } from "@/lib/ops/health-status";
import {
  emptyHostedControlEvidence,
  readyHostedControlEvidence,
} from "@/lib/ops/host-control-evidence";
import { buildHostActions } from "@/lib/ops/host-readiness-actions";
import { memoryDatabaseBootAttestation } from "@/lib/ops/database-boot";

function baseHealth(overrides: Partial<HealthStatus> = {}): HealthStatus {
  return {
    status: "ok",
    version: "0.1.0",
    commit: "abc1234",
    builtAt: "2026-09-23T12:00:00Z",
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
    cronConfigured: true,
    mfaEnabled: true,
    mfaMode: "totp",
    totpEncryptionConfigured: true,
    mfaOperatorBypassConfigured: false,
    mfaDurableFallbackRecent: false,
    hostedCustomerMode: true,
    demoAuthEnabled: false,
    hostedControlEvidence: emptyHostedControlEvidence({
      attachmentStorageGaps: ["approved_flag", "review_stale", "storage_config"],
      strictUploadScanGaps: ["scanner_url", "scanner_skip_allowed"],
      backupRestoreGaps: ["configured_flag"],
      alertDeliveryGaps: ["review_date_or_owner"],
      publicLegalContactsGaps: ["contacts_incomplete"],
    }),
    observability: {
      backend: "noop",
      storeEnabled: false,
      fileDualWrite: false,
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
      verifiedAt: "2026-09-23T12:03:50.988Z",
      tailTag: "0092_mfa_reenroll_grace",
      tailIdx: 92,
      tables: 120,
      columns: 1274,
      policies: 134,
    },
    tenantRegistry: { unionCount: 1, seeded: true },
    ...overrides,
  };
}

describe("buildHostActions", () => {
  it("exposes CapRover env keys and gap codes for hosted-customer evidence gaps", () => {
    const actions = buildHostActions(baseHealth());
    const storage = actions.find((a) => a.id === "attachmentStorageApproved");
    expect(storage?.ok).toBe(false);
    expect(storage?.severity).toBe("blocking");
    expect(storage?.group).toBe("attestation");
    expect(storage?.gapCodes).toEqual([
      "approved_flag",
      "review_stale",
      "storage_config",
    ]);
    expect(storage?.envKeys.map((k) => k.name)).toEqual(
      expect.arrayContaining([
        "UNIONOPS_ATTACHMENT_STORAGE_APPROVED",
        "UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_AT",
        "UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_BY",
        "ATTACHMENT_LOCAL_DIR",
      ]),
    );
    expect(storage?.caproverBlock).toContain(
      "UNIONOPS_ATTACHMENT_STORAGE_APPROVED=true",
    );
    expect(storage?.caproverBlock).toContain("YYYY-MM-DD");

    const scan = actions.find((a) => a.id === "strictUploadScan");
    expect(scan?.gapCodes).toEqual(["scanner_url", "scanner_skip_allowed"]);
    expect(scan?.caproverBlock).toContain("ATTACHMENT_SCAN_MODE=strict");
  });

  it("marks attestation actions ok when evidence passes", () => {
    const actions = buildHostActions(
      baseHealth({
        hostedControlEvidence: readyHostedControlEvidence(),
      }),
    );
    expect(
      actions
        .filter((a) => a.group === "attestation")
        .every((a) => a.ok && a.gapCodes.length === 0),
    ).toBe(true);
  });
});
