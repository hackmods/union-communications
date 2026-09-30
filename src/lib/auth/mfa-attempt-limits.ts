import { eq, lte, lt, or, sql } from "drizzle-orm";
import { hostedCustomerProfileEnabled } from "@/lib/auth/mfa-requirements";
import { getDb } from "@/lib/db/client";
import { mfaVerificationAttempts } from "@/lib/db/schema/auth";
import { withRlsContext } from "@/lib/db/rls-context";

export const MFA_ATTEMPT_LIMIT = 10;
export const MFA_ATTEMPT_WINDOW_MS = 15 * 60_000;

type AttemptWindow = { startedAt: number; count: number };
const memoryWindows = new Map<string, AttemptWindow>();

function postgresAttemptStoreEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    Boolean(env.DATABASE_URL?.trim())
  );
}

export interface MfaAttemptDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

function retryAfter(startedAt: number, now: number): number {
  return Math.max(1, Math.ceil((startedAt + MFA_ATTEMPT_WINDOW_MS - now) / 1000));
}

function reserveInMemory(
  userId: string,
  now: number,
): MfaAttemptDecision {
  const current = memoryWindows.get(userId);
  if (!current || now >= current.startedAt + MFA_ATTEMPT_WINDOW_MS) {
    memoryWindows.set(userId, { startedAt: now, count: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= MFA_ATTEMPT_LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: retryAfter(current.startedAt, now),
    };
  }
  memoryWindows.set(userId, { ...current, count: current.count + 1 });
  return { allowed: true, retryAfterSeconds: 0 };
}

async function reserveInPostgres(
  userId: string,
  now: number,
): Promise<MfaAttemptDecision> {
  const cutoff = new Date(now - MFA_ATTEMPT_WINDOW_MS);
  const windowStartedAt = new Date(now);
  // Drizzle `sql` templates stringify Date via Date#toString() ("Wed Sep 30 ... GMT"),
  // which Postgres rejects as timestamptz. Bind ISO-8601 and cast explicitly.
  const cutoffIso = cutoff.toISOString();
  const windowStartedAtIso = windowStartedAt.toISOString();
  return withRlsContext({ userId }, async () => {
    const db = getDb();
    const table = mfaVerificationAttempts;
    const [updated] = await db
      .insert(table)
      .values({ userId, windowStartedAt, attemptCount: 1 })
      .onConflictDoUpdate({
        target: table.userId,
        set: {
          windowStartedAt: sql`case when ${table.windowStartedAt} <= ${cutoffIso}::timestamptz then ${windowStartedAtIso}::timestamptz else ${table.windowStartedAt} end`,
          attemptCount: sql`case when ${table.windowStartedAt} <= ${cutoffIso}::timestamptz then 1 else ${table.attemptCount} + 1 end`,
        },
        setWhere: or(
          lte(table.windowStartedAt, cutoff),
          lt(table.attemptCount, MFA_ATTEMPT_LIMIT),
        ),
      })
      .returning({ attemptCount: table.attemptCount });

    if (updated) return { allowed: true, retryAfterSeconds: 0 };

    const [current] = await db
      .select({ windowStartedAt: table.windowStartedAt })
      .from(table)
      .where(eq(table.userId, userId));
    return {
      allowed: false,
      retryAfterSeconds: current
        ? retryAfter(current.windowStartedAt.getTime(), now)
        : Math.ceil(MFA_ATTEMPT_WINDOW_MS / 1000),
    };
  });
}

/**
 * Reserve one MFA verification attempt. Prefer durable Postgres so replicas
 * share the cap. If the durable write fails, fall back to process memory even
 * on hosted hosts — hard-failing here locks every sign-in behind a false
 * "storage unavailable" and is worse than a per-replica limit.
 */
export async function reserveMfaVerificationAttempt(
  userId: string,
  now = Date.now(),
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<MfaAttemptDecision> {
  const postgres = postgresAttemptStoreEnabled(env);
  const hosted = hostedCustomerProfileEnabled(env);
  if (hosted && !postgres) {
    throw new Error("Hosted MFA attempt limits require durable PostgreSQL storage.");
  }

  if (postgres) {
    try {
      return await reserveInPostgres(userId, now);
    } catch (error) {
      console.error("[auth] MFA attempt-limit Postgres write failed; using memory fallback", {
        userId,
        hosted,
        message: error instanceof Error ? error.message : String(error),
      });
      return reserveInMemory(userId, now);
    }
  }

  return reserveInMemory(userId, now);
}

/** @internal test helper */
export function resetMfaVerificationAttemptsForTests(): void {
  memoryWindows.clear();
}
