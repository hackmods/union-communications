import { eq, lt } from "drizzle-orm";
import { hostedCustomerProfileEnabled } from "@/lib/auth/mfa-requirements";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { mfaTotpCounters } from "@/lib/db/schema/auth";
import { withRlsContext } from "@/lib/db/rls-context";

const memoryLastCounter = new Map<string, number>();

function postgresCounterStoreEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    isPostgresConfigured(env)
  );
}

function assertStoreAvailable(env: NodeJS.ProcessEnv = process.env): void {
  if (hostedCustomerProfileEnabled(env) && !postgresCounterStoreEnabled(env)) {
    throw new Error("Hosted customer TOTP replay protection requires durable PostgreSQL storage.");
  }
}

/**
 * Atomically consume a matched RFC 6238 counter. A counter is accepted once
 * per account even when requests reach different app replicas concurrently.
 */
export async function consumeTotpCounterForUser(
  userId: string,
  counter: number,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  assertStoreAvailable(env);
  if (!Number.isSafeInteger(counter) || counter < 0) return false;

  if (postgresCounterStoreEnabled(env)) {
    try {
      return await withRlsContext({ userId }, async () => {
        const rows = await getDb()
          .insert(mfaTotpCounters)
          .values({ userId, lastCounter: counter })
          .onConflictDoUpdate({
            target: mfaTotpCounters.userId,
            set: { lastCounter: counter },
            setWhere: lt(mfaTotpCounters.lastCounter, counter),
          })
          .returning({ userId: mfaTotpCounters.userId });
        return rows.length === 1;
      });
    } catch (error) {
      console.error("[auth] TOTP replay counter Postgres write failed", {
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
      if (hostedCustomerProfileEnabled(env)) throw error;
    }
  }

  const last = memoryLastCounter.get(userId);
  if (last !== undefined && counter <= last) return false;
  memoryLastCounter.set(userId, counter);
  return true;
}

/** Seed the just-verified enrollment counter when a new secret is confirmed. */
export async function setTotpCounterForNewSecret(
  userId: string,
  counter: number,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  assertStoreAvailable(env);
  if (!Number.isSafeInteger(counter) || counter < 0) {
    throw new Error("Invalid TOTP counter.");
  }

  if (postgresCounterStoreEnabled(env)) {
    await withRlsContext({ userId }, async () => {
      await getDb()
        .insert(mfaTotpCounters)
        .values({ userId, lastCounter: counter })
        .onConflictDoUpdate({
          target: mfaTotpCounters.userId,
          set: { lastCounter: counter },
        });
    });
    return;
  }

  memoryLastCounter.set(userId, counter);
}

/** Drop replay-protection state when enrollment is cleared. */
export async function clearTotpCounterForUser(
  userId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (postgresCounterStoreEnabled(env)) {
    await withRlsContext({ userId }, async () => {
      await getDb()
        .delete(mfaTotpCounters)
        .where(eq(mfaTotpCounters.userId, userId));
    });
    return;
  }
  memoryLastCounter.delete(userId);
}

/** @internal test helper */
export function resetMfaTotpCountersForTests(): void {
  memoryLastCounter.clear();
}
