import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type DbBackend,
  isMemoryCaseDataActive,
  isPostgresFlipComplete,
  readEffectiveBackendFlags,
} from "@/lib/db/backend";
import { isPostgresConfigured } from "@/lib/db/client";
import { isDemoAuthEnabled } from "@/lib/auth/demo-auth-gate";
import {
  buildObservabilityHealth,
  type ObservabilityHealth,
} from "@/lib/observability/config";
import {
  probeSchema,
  type SchemaProbeView,
} from "@/lib/ops/schema-probe";

/** Non-secret runtime summary for `/api/health` (operators + smoke). */
export type HealthStatus = {
  status: "ok" | "degraded";
  version: string;
  commit: string;
  /** ISO-8601 UTC image build time (Docker runner stage) or "unknown". */
  builtAt: string;
  backends: Record<string, DbBackend>;
  postgresConfigured: boolean;
  memoryCaseDataActive: boolean;
  postgresFlipComplete: boolean;
  /** Max applied Drizzle migration idx from `platform_meta` (null when Postgres off / pre-baseline). */
  schemaVersion: number | null;
  /** Applied data-migration pointer from `platform_meta` (null when Postgres off / pre-baseline). */
  dataVersion: number | null;
  emailEnabled: boolean;
  cronConfigured: boolean;
  mfaEnabled: boolean;
  demoAuthEnabled: boolean;
  /** Operator error sinks (Sentry / JSONL) — no secrets. */
  observability: ObservabilityHealth;
  /** Schema drift probe: applied count + critical columns + boot-commit divergence. */
  schemaProbe: SchemaProbeView;
};

let cachedVersion: string | undefined;
let cachedBuiltAt: string | undefined;

/** Read app version from package.json once per process (non-secret). */
export function readAppVersion(): string {
  if (cachedVersion) return cachedVersion;
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    cachedVersion =
      (JSON.parse(raw) as { version?: string }).version?.trim() || "unknown";
  } catch {
    cachedVersion = "unknown";
  }
  return cachedVersion;
}

/** Read image build timestamp written at Docker build time (non-secret). */
export function readBuildTime(): string {
  const fromEnv = process.env.BUILD_TIME?.trim();
  if (fromEnv) {
    cachedBuiltAt = fromEnv;
    return cachedBuiltAt;
  }
  if (cachedBuiltAt) return cachedBuiltAt;
  try {
    cachedBuiltAt =
      readFileSync(join(process.cwd(), ".build-time"), "utf8").trim() || "unknown";
  } catch {
    cachedBuiltAt = "unknown";
  }
  return cachedBuiltAt;
}

export function buildHealthStatus(): HealthStatus {
  return {
    status: "ok",
    version: readAppVersion(),
    commit: process.env.BUILD_COMMIT_SHA?.trim() || "unknown",
    builtAt: readBuildTime(),
    backends: readEffectiveBackendFlags(),
    postgresConfigured: isPostgresConfigured(),
    memoryCaseDataActive: isMemoryCaseDataActive(),
    postgresFlipComplete: isPostgresFlipComplete(),
    schemaVersion: null,
    dataVersion: null,
    emailEnabled: process.env.EMAIL_ENABLED === "true",
    cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    mfaEnabled: process.env.AUTH_MFA_ENABLED === "true",
    demoAuthEnabled: isDemoAuthEnabled(),
    observability: buildObservabilityHealth(),
    schemaProbe: EMPTY_SCHEMA_PROBE,
  };
}

/**
 * Probe Postgres for column / journal drift and merge the result into a
 * `HealthStatus` snapshot. `platform_meta` is the only reliable source from
 * the runtime role. Returns a status with `status: "degraded"` whenever a
 * critical column is missing — operators see one glance whether the next
 * deploy needs a forced maintain / re-migrate.
 *
 * The probe is safe-by-default: never throws, returns `EMPTY_SCHEMA_PROBE`
 * on any DB error so /api/health stays 200.
 */
export async function buildHealthStatusWithProbe(): Promise<HealthStatus> {
  const base = buildHealthStatus();
  const buildCommit = process.env.BUILD_COMMIT_SHA?.trim() || "unknown";
  try {
    const probe = await probeSchema({ buildCommit });
    base.schemaProbe = probe;
    if (probe.platformMeta) {
      // Backwards-compat: the original /api/health surface exposed
      // schemaVersion / dataVersion at the top level. Keep that contract.
      base.schemaVersion = probe.platformMeta.schemaVersion;
      base.dataVersion = probe.platformMeta.dataVersion;
    }
    if (probe.postgresConfigured && !probe.journalInSync) {
      base.status = "degraded";
    }
  } catch {
    // Probe must never break the health route — keep EMPTY_SCHEMA_PROBE shape.
    base.schemaProbe = EMPTY_SCHEMA_PROBE;
  }
  return base;
}

const EMPTY_SCHEMA_PROBE: SchemaProbeView = {
  postgresConfigured: false,
  applied: { count: null, source: "unknown" },
  expectedJournalCount: 0,
  expectedJournalTags: [],
  journalInSync: true,
  platformMeta: null,
  criticalColumns: { tasks: { expected: [], present: [], missing: [] } },
  bootCommitMismatch: false,
};
