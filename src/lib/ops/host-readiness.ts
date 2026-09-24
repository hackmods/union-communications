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
  | "emailEnabled"
  | "cronConfigured"
  | "mfaEnabled"
  | "demoAuthOff";

export type PresenceCheck = {
  id: PresenceCheckId;
  ok: boolean;
  /** CapRover / env hint (non-secret key names only). */
  hintKey: string;
  /**
   * Advisory checks never block `ready` or CI deploy gates.
   * MFA / email / cron stay optional — MFA must not gate casework.
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
  /** Missing optional hardening (MFA, email, cron) — surface only. */
  missingAdvisoryPresence: PresenceCheck[];
  memoryCaseDataActive: boolean;
  postgresFlipComplete: boolean;
  healthStatus: HealthStatus["status"];
  /** True when nothing blocking is missing for a durable Hub + Portal host (Data may stay memory). MFA never required. */
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

  return [
    {
      id: "postgresConfigured",
      ok: health.postgresConfigured,
      hintKey: "DATABASE_URL",
      advisory: false,
    },
    {
      id: "migrateVerified",
      ok: migrateVerified,
      hintKey: "MIGRATE_DATABASE_URL",
      advisory: false,
    },
    {
      id: "emailEnabled",
      ok: health.emailEnabled,
      hintKey: "EMAIL_ENABLED",
      advisory: true,
    },
    {
      id: "cronConfigured",
      ok: health.cronConfigured,
      hintKey: "CRON_SECRET",
      advisory: true,
    },
    {
      id: "mfaEnabled",
      ok: health.mfaEnabled,
      hintKey: "AUTH_MFA_ENABLED",
      advisory: true,
    },
    {
      id: "demoAuthOff",
      ok: !health.demoAuthEnabled,
      hintKey: "AUTH_ALLOW_DEMO_USERS",
      advisory: false,
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
    !health.demoAuthEnabled;

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
    lines.push("Advisory (optional — MFA does not block casework):");
    for (const row of readiness.missingAdvisoryPresence) {
      lines.push(`  - ${row.id} (${row.hintKey})`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
