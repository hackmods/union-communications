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
import { checkPublicDocumentsReadiness, type PublicDocumentsReadiness } from "@/lib/public-documents/readiness";
import { isHostedCustomerMode, isMfaEnabled, resolveMfaMode } from "@/lib/auth/mfa-policy";
import { isMfaOperatorBypassConfigured } from "@/lib/auth/mfa-operator-bypass";
import { isTotpEncryptionConfigured } from "@/lib/auth/totp-secret-crypto";
import { readHostedControlEvidence, type HostedControlEvidence } from "@/lib/ops/host-control-evidence";

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
  /** True when ACCESS_REQUEST_NOTIFY_EMAIL is set (operator ping for /join). */
  accessRequestNotifyConfigured: boolean;
  cronConfigured: boolean;
  mfaEnabled: boolean;
  mfaMode: "shared_code_insecure" | "totp" | null;
  /** True when AUTH_TOTP_ENCRYPTION_KEY parses; never includes the key material. */
  totpEncryptionConfigured: boolean;
  /**
   * True when AUTH_MFA_OPERATOR_BYPASS_EMAILS is non-empty.
   * Never includes the allowlisted addresses.
   */
  mfaOperatorBypassConfigured: boolean;
  hostedCustomerMode: boolean;
  demoAuthEnabled: boolean;
  /** Operator error sinks (Sentry / JSONL) — no secrets. */
  observability: ObservabilityHealth;
  /** Boolean-only operator evidence; detailed values stay in deployment config. */
  hostedControlEvidence: HostedControlEvidence;
  /** Non-authoritative evidence from the fail-closed boot deployment gate. */
  databaseDeployment: DatabaseBootAttestation;
  /**
   * Tenant registry probe — schema gate does not seed `unions`.
   * Does not flip HTTP 503 by itself (CapRover would loop); host readiness
   * treats empty registry as blocking when Postgres is configured.
   */
  tenantRegistry: TenantRegistryHealth;
  publicDocuments?: PublicDocumentsReadiness;
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
  const publicDocuments = await checkPublicDocumentsReadiness();
  // Public-document readiness only applies when Postgres can hold publications.
  // Production memory hosts (CI `npm start`, demo images) must stay HTTP 200.
  const requirePublicDocs =
    postgresConfigured &&
    (process.env.NODE_ENV === "production" ||
      process.env.PUBLIC_DOCUMENTS_REQUIRE_READY === "true");
  return {
    status:
      (postgresConfigured && !databaseDeployment.verified) ||
      (requirePublicDocs && !publicDocuments.ready)
        ? "degraded"
        : "ok",
    version: readAppVersion(),
    commit: process.env.BUILD_COMMIT_SHA?.trim() || "unknown",
    builtAt: readBuildTime(),
    backends: readEffectiveBackendFlags(),
    postgresConfigured,
    memoryCaseDataActive: isMemoryCaseDataActive(),
    postgresFlipComplete: isPostgresFlipComplete(),
    emailEnabled: process.env.EMAIL_ENABLED === "true",
    accessRequestNotifyConfigured: Boolean(
      process.env.ACCESS_REQUEST_NOTIFY_EMAIL?.trim(),
    ),
    cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    mfaEnabled: isMfaEnabled(),
    mfaMode: resolveMfaMode(),
    totpEncryptionConfigured: isTotpEncryptionConfigured(),
    mfaOperatorBypassConfigured: isMfaOperatorBypassConfigured(),
    hostedCustomerMode: isHostedCustomerMode(),
    demoAuthEnabled: isDemoAuthEnabled(),
    observability: buildObservabilityHealth(),
    hostedControlEvidence: readHostedControlEvidence(),
    databaseDeployment,
    tenantRegistry,
    publicDocuments,
  };
}
