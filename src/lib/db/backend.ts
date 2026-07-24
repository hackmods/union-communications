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

export function timeDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("TIME_DB_BACKEND", env);
}

export function attachmentsDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("ATTACHMENTS_DB_BACKEND", env);
}

export function discussionsDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("DISCUSSIONS_DB_BACKEND", env);
}

export function tasksDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("TASKS_DB_BACKEND", env);
}

export function informalLogDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("INFORMAL_LOG_DB_BACKEND", env);
}

export function minutesDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("MINUTES_DB_BACKEND", env);
}

export function ledgerDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("LEDGER_DB_BACKEND", env);
}

export function officersDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("OFFICERS_DB_BACKEND", env);
}

export function travelDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("TRAVEL_DB_BACKEND", env);
}

export function committeesDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("COMMITTEES_DB_BACKEND", env);
}

export function electionsDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("ELECTIONS_DB_BACKEND", env);
}

/**
 * Pulse poll definitions + responses (FUTURE-006).
 * Default memory for demos; production collection should use postgres.
 */
export function pollsDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("POLLS_DB_BACKEND", env);
}

/** True when any confidential module still uses the in-memory store. */
export function isMemoryCaseDataActive(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return (
    grievanceDbBackend(env) === "memory" ||
    bumpingDbBackend(env) === "memory" ||
    auditDbBackend(env) === "memory" ||
    timeDbBackend(env) === "memory" ||
    attachmentsDbBackend(env) === "memory" ||
    discussionsDbBackend(env) === "memory" ||
    tasksDbBackend(env) === "memory" ||
    informalLogDbBackend(env) === "memory" ||
    minutesDbBackend(env) === "memory" ||
    ledgerDbBackend(env) === "memory" ||
    officersDbBackend(env) === "memory" ||
    travelDbBackend(env) === "memory" ||
    committeesDbBackend(env) === "memory" ||
    electionsDbBackend(env) === "memory" ||
    pollsDbBackend(env) === "memory"
  );
}
