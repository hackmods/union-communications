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
import {
  buildHostActions,
  type HostAction,
  type HostActionId,
} from "@/lib/ops/host-readiness-actions";

export type { HostAction, HostActionId } from "@/lib/ops/host-readiness-actions";
export { formatBackendFlipCaproverBlock } from "@/lib/ops/host-readiness-actions";

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

/** @deprecated Prefer {@link HostActionId} — kept for email/CI compatibility. */
export type PresenceCheckId = HostActionId;

export type PresenceCheck = {
  id: PresenceCheckId;
  ok: boolean;
  /** CapRover / env hint (non-secret key names only). */
  hintKey: string;
  /**
   * Advisory checks never block `ready` or CI deploy gates.
   * Some profile-specific requirements can be advisory on self-hosted/demo
   * installs and blocking for UnionOps-operated customer hosting.
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
  /** CapRover action board (source of truth for the Host readiness page). */
  actions: HostAction[];
  missingActions: HostAction[];
  missingBlockingActions: HostAction[];
  missingAdvisoryActions: HostAction[];
  /** Attestation actions that need a fresh 90-day review. */
  missingAttestationActions: HostAction[];
  presence: PresenceCheck[];
  missingPresence: PresenceCheck[];
  /** Missing presence that should fail deploy / Host “needs work” severity. */
  missingBlockingPresence: PresenceCheck[];
  /** Missing optional controls for the active host profile — surface only. */
  missingAdvisoryPresence: PresenceCheck[];
  memoryCaseDataActive: boolean;
  postgresFlipComplete: boolean;
  healthStatus: HealthStatus["status"];
  /** True when nothing blocking is missing for a durable Hub + Portal host (Data may stay memory). */
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

function hintKeyForAction(action: HostAction): string {
  if (action.commandHint) return action.commandHint;
  if (action.envKeys.length === 0) return action.id;
  return action.envKeys.map((key) => key.name).join(", ");
}

function presenceFromActions(actions: HostAction[]): PresenceCheck[] {
  return actions.map((action) => ({
    id: action.id,
    ok: action.ok,
    hintKey: hintKeyForAction(action),
    advisory: action.severity === "advisory",
  }));
}

/** Build the CapRover / durable-host checklist from live health (no secrets). */
export function buildHostReadiness(health: HealthStatus): HostReadiness {
  const backends = backendRows(health.backends);
  const missingBackendFlips = backends.filter((row) => !row.ok);
  const actions = buildHostActions(health);
  const missingActions = actions.filter((row) => !row.ok);
  const missingBlockingActions = missingActions.filter(
    (row) => row.severity === "blocking",
  );
  const missingAdvisoryActions = missingActions.filter(
    (row) => row.severity === "advisory",
  );
  const missingAttestationActions = missingActions.filter(
    (row) => row.group === "attestation",
  );
  const presence = presenceFromActions(actions);
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
  const documentsReady = health.publicDocuments?.ready ?? true;
  const finalReady = ready && documentsReady;

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
    actions,
    missingActions,
    missingBlockingActions,
    missingAdvisoryActions,
    missingAttestationActions,
    presence,
    missingPresence,
    missingBlockingPresence,
    missingAdvisoryPresence,
    memoryCaseDataActive: health.memoryCaseDataActive,
    postgresFlipComplete: health.postgresFlipComplete,
    healthStatus: health.status,
    ready: finalReady,
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
    lines.push("Advisory (optional — MFA does not block casework):");
    for (const row of readiness.missingAdvisoryPresence) {
      lines.push(`  - ${row.id} (${row.hintKey})`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
