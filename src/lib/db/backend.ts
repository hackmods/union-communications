/**
 * Per-module persistence backend flags (SEC-003).
 * Default remains `memory` until Postgres adapters are proven and DATABASE_URL is set.
 */

export type DbBackend = "memory" | "postgres";

/** Env keys reported on `/api/health` `backends` for operator flip verification. */
export const DB_BACKEND_ENV_KEYS = [
  "GRIEVANCE_DB_BACKEND",
  "BUMPING_DB_BACKEND",
  "AUDIT_DB_BACKEND",
  "TIME_DB_BACKEND",
  "ATTACHMENTS_DB_BACKEND",
  "DISCUSSIONS_DB_BACKEND",
  "TASKS_DB_BACKEND",
  "INFORMAL_LOG_DB_BACKEND",
  "MINUTES_DB_BACKEND",
  "LEDGER_DB_BACKEND",
  "OFFICERS_DB_BACKEND",
  "TRAVEL_DB_BACKEND",
  "EXPENSES_DB_BACKEND",
  "COMMITTEES_DB_BACKEND",
  "ELECTIONS_DB_BACKEND",
  "POLLS_DB_BACKEND",
  "MEETINGS_DB_BACKEND",
  "MEETINGS_RSVP_DB_BACKEND",
  "CHECKINS_DB_BACKEND",
  "AUTH_USERS_BACKEND",
] as const;

export type DbBackendEnvKey = (typeof DB_BACKEND_ENV_KEYS)[number];

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

/** Union business expense submissions (ORG-009). */
export function expensesDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("EXPENSES_DB_BACKEND", env);
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

/**
 * Local membership meeting schedule (Calendar & Meetings Phase A).
 * Not confidential (no PII), but shares the memory/postgres adapter pattern.
 */
export function meetingsDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("MEETINGS_DB_BACKEND", env);
}

/**
 * Calendar R1 — UnionMeeting + RSVP tokens/responses.
 * Default memory for demos; production collection should use postgres
 * (responses carry display names / optional contact fields).
 */
export function meetingsRsvpDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("MEETINGS_RSVP_DB_BACKEND", env);
}

/** Automatic check-ins (Basecamp-style). Default memory for demos. */
export function checkinsDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("CHECKINS_DB_BACKEND", env);
}

/** Durable Hub users + password-reset tokens (SEC-007). */
export function authUsersDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveBackend("AUTH_USERS_BACKEND", env);
}

/** Effective backend per module (respects DATABASE_URL fallback warnings). */
export function readEffectiveBackendFlags(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Record<DbBackendEnvKey, DbBackend> {
  return {
    GRIEVANCE_DB_BACKEND: grievanceDbBackend(env),
    BUMPING_DB_BACKEND: bumpingDbBackend(env),
    AUDIT_DB_BACKEND: auditDbBackend(env),
    TIME_DB_BACKEND: timeDbBackend(env),
    ATTACHMENTS_DB_BACKEND: attachmentsDbBackend(env),
    DISCUSSIONS_DB_BACKEND: discussionsDbBackend(env),
    TASKS_DB_BACKEND: tasksDbBackend(env),
    INFORMAL_LOG_DB_BACKEND: informalLogDbBackend(env),
    MINUTES_DB_BACKEND: minutesDbBackend(env),
    LEDGER_DB_BACKEND: ledgerDbBackend(env),
    OFFICERS_DB_BACKEND: officersDbBackend(env),
    TRAVEL_DB_BACKEND: travelDbBackend(env),
    EXPENSES_DB_BACKEND: expensesDbBackend(env),
    COMMITTEES_DB_BACKEND: committeesDbBackend(env),
    ELECTIONS_DB_BACKEND: electionsDbBackend(env),
    POLLS_DB_BACKEND: pollsDbBackend(env),
    MEETINGS_DB_BACKEND: meetingsDbBackend(env),
    MEETINGS_RSVP_DB_BACKEND: meetingsRsvpDbBackend(env),
    CHECKINS_DB_BACKEND: checkinsDbBackend(env),
    AUTH_USERS_BACKEND: authUsersDbBackend(env),
  };
}

/** True when every confidential module and auth users use Postgres. */
export function isPostgresFlipComplete(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return (
    !isMemoryCaseDataActive(env) && authUsersDbBackend(env) === "postgres"
  );
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
    expensesDbBackend(env) === "memory" ||
    committeesDbBackend(env) === "memory" ||
    electionsDbBackend(env) === "memory" ||
    pollsDbBackend(env) === "memory" ||
    meetingsDbBackend(env) === "memory" ||
    meetingsRsvpDbBackend(env) === "memory" ||
    checkinsDbBackend(env) === "memory"
  );
}
