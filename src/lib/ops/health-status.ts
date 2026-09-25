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
  memoryDatabaseBootAttestation,
  readDatabaseBootAttestation,
  type DatabaseBootAttestation,
} from "@/lib/ops/database-boot";
import { countUnions } from "@/lib/tenant/union-exists";

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
  emailEnabled: boolean;
  cronConfigured: boolean;
  mfaEnabled: boolean;
  demoAuthEnabled: boolean;
  /** Operator error sinks (Sentry / JSONL) — no secrets. */
  observability: ObservabilityHealth;
  /** Non-authoritative evidence from the fail-closed boot deployment gate. */
  databaseDeployment: DatabaseBootAttestation;
  /**
   * Tenant registry probe — schema gate does not seed `unions`.
   * Does not flip HTTP 503 by itself (CapRover would loop); host readiness
   * treats empty registry as blocking when Postgres is configured.
   */
  tenantRegistry: TenantRegistryHealth;
};

export type TenantRegistryHealth = {
  /** null when Postgres unset or count failed */
  unionCount: number | null;
  /** true when ≥1 union row; false when count is 0; null when unknown */
  seeded: boolean | null;
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

export async function readTenantRegistryHealth(
  postgresConfigured: boolean,
): Promise<TenantRegistryHealth> {
  if (!postgresConfigured) {
    return { unionCount: null, seeded: null };
  }
  const unionCount = await countUnions();
  if (unionCount == null) {
    return { unionCount: null, seeded: null };
  }
  return { unionCount, seeded: unionCount > 0 };
}

export async function buildHealthStatus(): Promise<HealthStatus> {
  const postgresConfigured = isPostgresConfigured();
  const databaseDeployment = postgresConfigured
    ? readDatabaseBootAttestation()
    : memoryDatabaseBootAttestation();
  const tenantRegistry = await readTenantRegistryHealth(postgresConfigured);
  return {
    status:
      postgresConfigured && !databaseDeployment.verified ? "degraded" : "ok",
    version: readAppVersion(),
    commit: process.env.BUILD_COMMIT_SHA?.trim() || "unknown",
    builtAt: readBuildTime(),
    backends: readEffectiveBackendFlags(),
    postgresConfigured,
    memoryCaseDataActive: isMemoryCaseDataActive(),
    postgresFlipComplete: isPostgresFlipComplete(),
    emailEnabled: process.env.EMAIL_ENABLED === "true",
    cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    mfaEnabled: process.env.AUTH_MFA_ENABLED === "true",
    demoAuthEnabled: isDemoAuthEnabled(),
    observability: buildObservabilityHealth(),
    databaseDeployment,
    tenantRegistry,
  };
}
