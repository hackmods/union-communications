/**
 * Resolves/persists a user's confirmed TOTP secret across both backends:
 * - `AUTH_USERS_BACKEND=postgres` — `users.totp_secret` / `users.mfa_enabled`
 * - demo roster (default) — in-memory override keyed by userId, since
 *   `DEMO_USERS` is a shared module-level const we don't want to mutate.
 */

import { eq } from "drizzle-orm";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import {
  getConfirmedSecretOverride,
  setConfirmedSecretOverride,
} from "@/lib/auth/mfa-enrollment-store";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";

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
  return DEMO_USERS.find((u) => u.id === userId)?.totpSecret ?? null;
}

/** Persists a newly-confirmed TOTP secret for a user. */
export async function persistTotpSecretForUser(
  userId: string,
  secret: string,
): Promise<void> {
  if (usersBackendEnabled()) {
    const db = getDb();
    await db
      .update(users)
      .set({ totpSecret: secret, mfaEnabled: true })
      .where(eq(users.id, userId));
    return;
  }

  setConfirmedSecretOverride(userId, secret);
}
