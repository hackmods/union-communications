/** Non-secret runtime summary for `/api/health` (operators + smoke). */
export type HealthStatus = {
  status: "ok";
  commit: string;
  backends: Record<string, string>;
  emailEnabled: boolean;
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

export function buildHealthStatus(): HealthStatus {
  const backends: Record<string, string> = {};
  for (const key of BACKEND_FLAGS) {
    backends[key] = process.env[key] ?? "memory";
  }
  return {
    status: "ok",
    commit: process.env.BUILD_COMMIT_SHA?.trim() || "unknown",
    backends,
    emailEnabled: process.env.EMAIL_ENABLED === "true",
  };
}
