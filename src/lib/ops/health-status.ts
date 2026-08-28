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

/** Non-secret runtime summary for `/api/health` (operators + smoke). */
export type HealthStatus = {
  status: "ok";
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
    emailEnabled: process.env.EMAIL_ENABLED === "true",
    cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    mfaEnabled: process.env.AUTH_MFA_ENABLED === "true",
    demoAuthEnabled: isDemoAuthEnabled(),
  };
}
