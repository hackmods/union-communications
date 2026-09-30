/**
 * Resolves/persists a user's confirmed TOTP secret across both backends:
 * - `AUTH_USERS_BACKEND=postgres` — `users.totp_secret` / `users.mfa_enabled`
 * - demo roster (default) — in-memory override keyed by userId, since
 *   `DEMO_USERS` is a shared module-level const we don't want to mutate.
 */

import { eq, sql } from "drizzle-orm";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import {
  clearConfirmedSecretOverride,
  clearPendingSecret,
  getConfirmedSecretOverride,
  isConfirmedSecretCleared,
  setConfirmedSecretOverride,
} from "@/lib/auth/mfa-enrollment-store";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { mfaTotpCounters } from "@/lib/db/schema/auth";
import { users } from "@/lib/db/schema/tenant";
import { clearTotpCounterForUser, setTotpCounterForNewSecret } from "@/lib/auth/mfa-totp-counters";
import { invalidateAllMfaRecoveryCodes } from "@/lib/auth/mfa-recovery-codes";
import { withRlsContext } from "@/lib/db/rls-context";

function usersBackendEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    isPostgresConfigured(env)
  );
}

/** Looks up the current confirmed TOTP secret for a user, if any. */
export async function getTotpSecretForUser(
  userId: string,
): Promise<string | null> {
  if (usersBackendEnabled()) {
    const db = getDb();
    const rows = await db
      .select({ totpSecret: users.totpSecret })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return rows[0]?.totpSecret ?? null;
  }

  const override = getConfirmedSecretOverride(userId);
  if (override) return override;
  if (isConfirmedSecretCleared(userId)) return null;
  return DEMO_USERS.find((u) => u.id === userId)?.totpSecret ?? null;
}

/** Persists a newly-confirmed TOTP secret for a user. */
export async function persistTotpSecretForUser(
  userId: string,
  secret: string,
  acceptedCounter: number,
): Promise<void> {
  if (usersBackendEnabled()) {
    await withRlsContext({ userId }, async () => {
      const db = getDb();
      await db
        .update(users)
        .set({
          totpSecret: secret,
          mfaEnabled: true,
          sessionVersion: sql`${users.sessionVersion} + 1`,
        })
        .where(eq(users.id, userId));
      await db
        .insert(mfaTotpCounters)
        .values({ userId, lastCounter: acceptedCounter })
        .onConflictDoUpdate({
          target: mfaTotpCounters.userId,
          set: { lastCounter: acceptedCounter },
        });
    });
    return;
  }

  await setTotpCounterForNewSecret(userId, acceptedCounter);
  setConfirmedSecretOverride(userId, secret);
}

/**
 * Admin / ops reset: remove authenticator enrollment so the user must
 * re-enroll. Invalidates recovery codes and bumps session version (Postgres).
 */
export async function clearTotpEnrollmentForUser(
  userId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  clearPendingSecret(userId);

  if (usersBackendEnabled(env)) {
    await withRlsContext({ userId }, async () => {
      const db = getDb();
      await db
        .update(users)
        .set({
          totpSecret: null,
          mfaEnabled: false,
          sessionVersion: sql`${users.sessionVersion} + 1`,
        })
        .where(eq(users.id, userId));
      // Do not DELETE — `unionops_app` has no DELETE on `mfa_totp_counters`
      // (0071). A failed delete used to roll back secret clear too.
      await db
        .update(mfaTotpCounters)
        .set({ lastCounter: 0 })
        .where(eq(mfaTotpCounters.userId, userId));
    });
  } else {
    clearConfirmedSecretOverride(userId);
    await clearTotpCounterForUser(userId, env);
  }

  await invalidateAllMfaRecoveryCodes(userId, env);
}
