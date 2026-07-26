import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Non-secret runtime summary for `/api/health` (operators + smoke). */
export type HealthStatus = {
  status: "ok";
  version: string;
  commit: string;
  backends: Record<string, string>;
  emailEnabled: boolean;
  cronConfigured: boolean;
  mfaEnabled: boolean;
};

const BACKEND_FLAGS = [
  "GRIEVANCE_DB_BACKEND",
  "BUMPING_DB_BACKEND",
  "TIME_DB_BACKEND",
  "ATTACHMENTS_DB_BACKEND",
  "AUDIT_DB_BACKEND",
  "AUTH_USERS_BACKEND",
  "MEETINGS_RSVP_DB_BACKEND",
] as const;

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
  const backends: Record<string, string> = {};
  for (const key of BACKEND_FLAGS) {
    backends[key] = process.env[key] ?? "memory";
  }
  return {
    status: "ok",
    version: readAppVersion(),
    commit: process.env.BUILD_COMMIT_SHA?.trim() || "unknown",
    backends,
    emailEnabled: process.env.EMAIL_ENABLED === "true",
    cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    mfaEnabled: process.env.AUTH_MFA_ENABLED === "true",
  };
}
