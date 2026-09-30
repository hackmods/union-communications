import "server-only";

/**
 * Durable re-enroll grace after Site Admin MFA reset.
 * While active, Hub MFA is not required so the officer can finish setup.
 */

import { eq } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";
import { withRlsContext } from "@/lib/db/rls-context";

export const MFA_REENROLL_GRACE_MS = 24 * 60 * 60_000;

/** Memory overlay when AUTH_USERS_BACKEND is not postgres. */
const memoryGraceUntil = new Map<string, number>();

function usersBackendEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    isPostgresConfigured(env)
  );
}

export async function armMfaReenrollGrace(
  userId: string,
  untilMs = Date.now() + MFA_REENROLL_GRACE_MS,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Date> {
  const until = new Date(untilMs);
  if (usersBackendEnabled(env)) {
    await withRlsContext({ userId }, async () => {
      await getDb()
        .update(users)
        .set({ mfaReenrollGraceUntil: until })
        .where(eq(users.id, userId));
    });
  } else {
    memoryGraceUntil.set(userId, until.getTime());
  }
  return until;
}

export async function clearMfaReenrollGrace(
  userId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  memoryGraceUntil.delete(userId);
  if (usersBackendEnabled(env)) {
    await withRlsContext({ userId }, async () => {
      await getDb()
        .update(users)
        .set({ mfaReenrollGraceUntil: null })
        .where(eq(users.id, userId));
    });
  }
}

export async function getMfaReenrollGrace(
  userId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Date | null> {
  if (usersBackendEnabled(env)) {
    const rows = await getDb()
      .select({ mfaReenrollGraceUntil: users.mfaReenrollGraceUntil })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return rows[0]?.mfaReenrollGraceUntil ?? null;
  }
  const ms = memoryGraceUntil.get(userId);
  return ms != null ? new Date(ms) : null;
}

export async function isMfaReenrollGraceActive(
  userId: string,
  now = Date.now(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const until = await getMfaReenrollGrace(userId, env);
  return Boolean(until && until.getTime() > now);
}

/** @internal test helper */
export function resetMfaReenrollGraceMemoryForTests(): void {
  memoryGraceUntil.clear();
}
