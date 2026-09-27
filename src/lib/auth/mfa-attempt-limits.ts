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

/**
 * Reserve one MFA verification attempt. Hosted accounts require a durable
 * Postgres counter so parallel requests and separate replicas share the cap.
 */
export async function reserveMfaVerificationAttempt(
  userId: string,
  now = Date.now(),
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<MfaAttemptDecision> {
  const postgres = postgresAttemptStoreEnabled(env);
  if (hostedCustomerProfileEnabled(env) && !postgres) {
    throw new Error("Hosted MFA attempt limits require durable PostgreSQL storage.");
  }

  const cutoff = new Date(now - MFA_ATTEMPT_WINDOW_MS);
  if (postgres) {
    return withRlsContext({ userId }, async () => {
      const db = getDb();
      const table = mfaVerificationAttempts;
      const [updated] = await db
        .insert(table)
        .values({ userId, windowStartedAt: new Date(now), attemptCount: 1 })
        .onConflictDoUpdate({
          target: table.userId,
          set: {
            windowStartedAt: sql`case when ${table.windowStartedAt} <= ${cutoff} then ${new Date(now)} else ${table.windowStartedAt} end`,
            attemptCount: sql`case when ${table.windowStartedAt} <= ${cutoff} then 1 else ${table.attemptCount} + 1 end`,
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

/** @internal test helper */
export function resetMfaVerificationAttemptsForTests(): void {
  memoryWindows.clear();
}
