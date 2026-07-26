import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type DbBackend,
  isMemoryCaseDataActive,
  isPostgresFlipComplete,
  readEffectiveBackendFlags,
} from "@/lib/db/backend";
import { isPostgresConfigured } from "@/lib/db/client";

/** Non-secret runtime summary for `/api/health` (operators + smoke). */
export type HealthStatus = {
  status: "ok";
  version: string;
  commit: string;
  backends: Record<string, DbBackend>;
  postgresConfigured: boolean;
  memoryCaseDataActive: boolean;
  postgresFlipComplete: boolean;
  emailEnabled: boolean;
  cronConfigured: boolean;
  mfaEnabled: boolean;
};

let cachedVersion: string | undefined;

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

export function buildHealthStatus(): HealthStatus {
  return {
    status: "ok",
    version: readAppVersion(),
    commit: process.env.BUILD_COMMIT_SHA?.trim() || "unknown",
    backends: readEffectiveBackendFlags(),
    postgresConfigured: isPostgresConfigured(),
    memoryCaseDataActive: isMemoryCaseDataActive(),
    postgresFlipComplete: isPostgresFlipComplete(),
    emailEnabled: process.env.EMAIL_ENABLED === "true",
    cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    mfaEnabled: process.env.AUTH_MFA_ENABLED === "true",
  };
}
