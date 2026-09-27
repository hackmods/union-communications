/**
 * Operator-facing host readiness checklist for CapRover durable rollout.
 * Pure over {@link HealthStatus} — no secrets, no CapRover API writes.
 */

import {
  DB_BACKEND_ENV_KEYS,
  type DbBackend,
  type DbBackendEnvKey,
} from "@/lib/db/backend";
import type { HealthStatus } from "@/lib/ops/health-status";

/** Production target per backend flag (aligned with docker/.env.production.example). */
export type BackendRecommendation = {
  recommended: DbBackend;
  /** When true, memory is an accepted interim target (not listed as “missing”). */
  intentionalMemory?: boolean;
};

/**
 * Recommended CapRover `*_DB_BACKEND` values for a lasting-storage host.
 * `DATA_DB_BACKEND` stays memory until the Data workbench flip is deliberate.
 */
export const RECOMMENDED_BACKENDS: Record<
  DbBackendEnvKey,
  BackendRecommendation
> = {
  GRIEVANCE_DB_BACKEND: { recommended: "postgres" },
  BUMPING_DB_BACKEND: { recommended: "postgres" },
  AUDIT_DB_BACKEND: { recommended: "postgres" },
  TIME_DB_BACKEND: { recommended: "postgres" },
  ATTACHMENTS_DB_BACKEND: { recommended: "postgres" },
  DISCUSSIONS_DB_BACKEND: { recommended: "postgres" },
  TASKS_DB_BACKEND: { recommended: "postgres" },
  INFORMAL_LOG_DB_BACKEND: { recommended: "postgres" },
  SNIPPETS_DB_BACKEND: { recommended: "postgres" },
  MINUTES_DB_BACKEND: { recommended: "postgres" },
  LEDGER_DB_BACKEND: { recommended: "postgres" },
  OFFICERS_DB_BACKEND: { recommended: "postgres" },
  TRAVEL_DB_BACKEND: { recommended: "postgres" },
  EXPENSES_DB_BACKEND: { recommended: "postgres" },
  COMMITTEES_DB_BACKEND: { recommended: "postgres" },
  ELECTIONS_DB_BACKEND: { recommended: "postgres" },
  POLLS_DB_BACKEND: { recommended: "postgres" },
  MEETINGS_DB_BACKEND: { recommended: "postgres" },
  MEETINGS_RSVP_DB_BACKEND: { recommended: "postgres" },
  CHECKINS_DB_BACKEND: { recommended: "postgres" },
  AUTH_USERS_BACKEND: { recommended: "postgres" },
  FEEDBACK_DB_BACKEND: { recommended: "postgres" },
  OFFICER_LEARNING_DB_BACKEND: { recommended: "postgres" },
  PLATFORM_SETTINGS_DB_BACKEND: { recommended: "postgres" },
  BYLAWS_DB_BACKEND: { recommended: "postgres" },
  PROPOSALS_DB_BACKEND: { recommended: "postgres" },
  DATA_DB_BACKEND: { recommended: "memory", intentionalMemory: true },
  ACCESS_REQUEST_DB_BACKEND: { recommended: "postgres" },
  PORTAL_DB_BACKEND: { recommended: "postgres" },
};

export type BackendReadinessRow = {
  key: DbBackendEnvKey;
  effective: DbBackend;
  recommended: DbBackend;
  ok: boolean;
  intentionalMemory: boolean;
};

export type PresenceCheckId =
  | "postgresConfigured"
  | "migrateVerified"
  | "tenantsSeeded"
  | "emailEnabled"
  | "accessRequestNotify"
  | "cronConfigured"
  | "mfaEnabled"
  | "demoAuthOff"
  | "attachmentStorageApproved"
  | "strictUploadScan"
  | "backupRestoreEvidence"
  | "alertDeliveryEvidence";

export type PresenceCheck = {
  id: PresenceCheckId;
  ok: boolean;
  /** CapRover / env hint (non-secret key names only). */
  hintKey: string;
  /** The app evaluates runtime settings or checks operator-supplied evidence. */
  evidenceSource: "runtime" | "operator-attested";
  /**
   * Advisory checks never block `ready` or CI deploy gates. Hosted customer
   * mode requires production TOTP and operational-control evidence.
   */
  advisory: boolean;
};

export type HostReadiness = {
  image: {
    version: string;
    commit: string;
    builtAt: string;
  };
  database: {
    mode: HealthStatus["databaseDeployment"]["mode"];
    verified: boolean;
    verifiedAt: string | null;
    tailTag: string | null;
    tailIdx: number | null;
    tables: number | null;
    columns: number | null;
    policies: number | null;
    journalSchema: string | null;
  };
  backends: BackendReadinessRow[];
  /** Backends that should be postgres (or intentional memory) but are wrong. */
  missingBackendFlips: BackendReadinessRow[];
  presence: PresenceCheck[];
  missingPresence: PresenceCheck[];
  /** Missing presence that should fail deploy / Host “needs work” severity. */
  missingBlockingPresence: PresenceCheck[];
  /** Missing optional checks for evaluation and self-hosted profiles. */
  missingAdvisoryPresence: PresenceCheck[];
  memoryCaseDataActive: boolean;
  postgresFlipComplete: boolean;
  healthStatus: HealthStatus["status"];
  /** True when the durable host contract and any selected customer-profile gates pass. */
  ready: boolean;
};

function backendRows(
  backends: HealthStatus["backends"],
): BackendReadinessRow[] {
  return DB_BACKEND_ENV_KEYS.map((key) => {
    const rec = RECOMMENDED_BACKENDS[key];
    const effective = backends[key];
    const intentionalMemory = Boolean(rec.intentionalMemory);
    const ok =
      effective === rec.recommended ||
      (intentionalMemory && effective === "memory");
    return {
      key,
      effective,
      recommended: rec.recommended,
      ok,
      intentionalMemory,
    };
  });
}

function presenceChecks(health: HealthStatus): PresenceCheck[] {
  const migrateVerified =
    health.postgresConfigured &&
    health.databaseDeployment.mode === "postgres" &&
    health.databaseDeployment.verified;

  const tenantsSeeded =
    !health.postgresConfigured || health.tenantRegistry.seeded !== false;

  return [
    {
      id: "postgresConfigured",
      ok: health.postgresConfigured,
      hintKey: "DATABASE_URL",
      evidenceSource: "runtime",
      advisory: false,
    },
    {
      id: "migrateVerified",
      ok: migrateVerified,
      hintKey: "MIGRATE_DATABASE_URL",
      evidenceSource: "runtime",
      advisory: false,
    },
    {
      id: "tenantsSeeded",
      ok: tenantsSeeded,
      hintKey: "npm run db:seed",
      evidenceSource: "runtime",
      advisory: false,
    },
    {
      id: "emailEnabled",
      ok: health.emailEnabled,
      hintKey: "EMAIL_ENABLED",
      evidenceSource: "runtime",
      advisory: true,
    },
    {
      id: "accessRequestNotify",
      // Only matters when email can send; otherwise surface EMAIL_ENABLED first.
      ok:
        !health.emailEnabled ||
        Boolean(health.accessRequestNotifyConfigured),
      hintKey: "ACCESS_REQUEST_NOTIFY_EMAIL",
      evidenceSource: "runtime",
      advisory: true,
    },
    {
      id: "cronConfigured",
      ok: health.cronConfigured,
      hintKey: "CRON_SECRET",
      evidenceSource: "runtime",
      advisory: true,
    },
    {
      id: "mfaEnabled",
      ok: health.mfaEnabled && health.mfaMode === "totp",
      hintKey: health.hostedCustomerMode
        ? "UNIONOPS_HOSTED_CUSTOMER_MODE=true, AUTH_MFA_MODE=totp, NODE_ENV=production"
        : "AUTH_MFA_ENABLED",
      evidenceSource: "runtime",
      advisory: !health.hostedCustomerMode,
    },
    {
      id: "demoAuthOff",
      ok: !health.demoAuthEnabled,
      hintKey: "AUTH_ALLOW_DEMO_USERS",
      evidenceSource: "runtime",
      advisory: false,
    },
    {
      id: "attachmentStorageApproved",
      ok: health.hostedControlEvidence.attachmentStorageApproved,
      hintKey:
        "UNIONOPS_ATTACHMENT_STORAGE_APPROVED=true, UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_AT/REVIEWED_BY, approved ATTACHMENT_STORAGE configuration",
      evidenceSource: "operator-attested",
      advisory: !health.hostedCustomerMode,
    },
    {
      id: "strictUploadScan",
      ok: health.hostedControlEvidence.strictUploadScan,
      hintKey:
        "ATTACHMENT_SCANNER_URL, ATTACHMENT_SCAN_MODE=strict, UNIONOPS_ATTACHMENT_SCAN_TESTED_AT/TESTED_BY; skip-on-error disabled",
      evidenceSource: "operator-attested",
      advisory: !health.hostedCustomerMode,
    },
    {
      id: "backupRestoreEvidence",
      ok: health.hostedControlEvidence.backupRestoreEvidence,
      hintKey:
        "UNIONOPS_BACKUP_CONFIGURED=true, UNIONOPS_BACKUP_RESTORE_TESTED_AT, UNIONOPS_BACKUP_OWNER",
      evidenceSource: "operator-attested",
      advisory: !health.hostedCustomerMode,
    },
    {
      id: "alertDeliveryEvidence",
      ok: health.hostedControlEvidence.alertDeliveryEvidence,
      hintKey:
        "UNIONOPS_ALERTS_CONFIGURED=true, UNIONOPS_ALERT_DELIVERY_TESTED_AT, UNIONOPS_ALERT_OWNER",
      evidenceSource: "operator-attested",
      advisory: !health.hostedCustomerMode,
    },
  ];
}

/** Build the CapRover / durable-host checklist from live health (no secrets). */
export function buildHostReadiness(health: HealthStatus): HostReadiness {
  const backends = backendRows(health.backends);
  const missingBackendFlips = backends.filter((row) => !row.ok);
  const presence = presenceChecks(health);
  const missingPresence = presence.filter((row) => !row.ok);
  const missingBlockingPresence = missingPresence.filter((row) => !row.advisory);
  const missingAdvisoryPresence = missingPresence.filter((row) => row.advisory);
  const ready =
    missingBackendFlips.length === 0 &&
    missingBlockingPresence.length === 0 &&
    health.postgresConfigured &&
    health.databaseDeployment.verified &&
    health.databaseDeployment.mode === "postgres" &&
    !health.memoryCaseDataActive &&
    health.postgresFlipComplete &&
    !health.demoAuthEnabled &&
    health.tenantRegistry.seeded !== false;

  return {
    image: {
      version: health.version,
      commit: health.commit,
      builtAt: health.builtAt,
    },
    database: {
      mode: health.databaseDeployment.mode,
      verified: health.databaseDeployment.verified,
      verifiedAt: health.databaseDeployment.verifiedAt,
      tailTag: health.databaseDeployment.tailTag,
      tailIdx: health.databaseDeployment.tailIdx,
      tables: health.databaseDeployment.tables,
      columns: health.databaseDeployment.columns,
      policies: health.databaseDeployment.policies,
      journalSchema: health.databaseDeployment.journalSchema,
    },
    backends,
    missingBackendFlips,
    presence,
    missingPresence,
    missingBlockingPresence,
    missingAdvisoryPresence,
    memoryCaseDataActive: health.memoryCaseDataActive,
    postgresFlipComplete: health.postgresFlipComplete,
    healthStatus: health.status,
    ready,
  };
}

/** Plain-text checklist for deploy-notify emails (no secrets). */
export function formatHostReadinessEmailBody(readiness: HostReadiness): string {
  const lines: string[] = [
    `UnionOps deploy health`,
    ``,
    `Version: ${readiness.image.version}`,
    `Commit: ${readiness.image.commit}`,
    `Built at: ${readiness.image.builtAt}`,
    `Ready: ${readiness.ready ? "yes" : "no"}`,
    `DB tip: ${readiness.database.tailTag ?? "unknown"} (verified=${readiness.database.verified})`,
    ``,
  ];
  const tenants = readiness.presence.find((p) => p.id === "tenantsSeeded");
  if (tenants && !tenants.ok) {
    lines.push(
      "Tenant registry empty: run npm run db:seed (or scripts/caprover-bootstrap-seed.sh) once after migrate.",
      "",
    );
  }
  if (readiness.missingBackendFlips.length > 0) {
    lines.push("Missing backend flips:");
    for (const row of readiness.missingBackendFlips) {
      lines.push(`  - ${row.key}=${row.effective} (want ${row.recommended})`);
    }
    lines.push("");
  }
  if (readiness.missingBlockingPresence.length > 0) {
    lines.push("Blocking presence:");
    for (const row of readiness.missingBlockingPresence) {
      lines.push(`  - ${row.id} (${row.hintKey})`);
    }
    lines.push("");
  }
  if (readiness.missingAdvisoryPresence.length > 0) {
    lines.push("Advisory items outside the hosted customer profile:");
    for (const row of readiness.missingAdvisoryPresence) {
      lines.push(`  - ${row.id} (${row.hintKey})`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
