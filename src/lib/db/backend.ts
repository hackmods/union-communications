/**
 * Per-module persistence backend flags (SEC-003).
 * Default remains `memory` until Postgres adapters are proven and DATABASE_URL is set.
 */

export type DbBackend = "memory" | "postgres";

function resolveBackend(
  envKey: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  const raw = env[envKey]?.trim().toLowerCase();
  if (raw === "postgres") {
    if (!env.DATABASE_URL?.trim()) {
      console.warn(
        `[db] ${envKey}=postgres but DATABASE_URL is unset — falling back to memory`,
      );
      return "memory";
    }
    return "postgres";
  }
  return "memory";
}

export function grievanceDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("GRIEVANCE_DB_BACKEND", env);
}

export function bumpingDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("BUMPING_DB_BACKEND", env);
}

export function auditDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("AUDIT_DB_BACKEND", env);
}

/** True when any confidential module still uses the in-memory store. */
export function isMemoryCaseDataActive(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return (
    grievanceDbBackend(env) === "memory" ||
    bumpingDbBackend(env) === "memory" ||
    auditDbBackend(env) === "memory"
  );
}
