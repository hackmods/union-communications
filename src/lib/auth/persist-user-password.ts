/**
 * Look up / update passwords across auth backends (Postgres users + memory invitees).
 * Demo roster is intentionally excluded from password reset.
 */

import { eq } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";
import {
  findInvitedUserRecordByEmail,
  updateInvitedUserPasswordHash,
} from "@/lib/auth/invites";

export type ResettableAccount = {
  id: string;
  email: string;
  name: string;
  source: "postgres" | "invite";
};

function usersBackendEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    isPostgresConfigured(env)
  );
}

/** Find an account that may receive a password-reset email (no demo roster). */
export async function findResettableAccountByEmail(
  email: string,
): Promise<ResettableAccount | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  if (usersBackendEnabled()) {
    const db = getDb();
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);
    const row = rows[0];
    if (row) {
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        source: "postgres",
      };
    }
  }

  const invited = findInvitedUserRecordByEmail(normalized);
  if (invited) {
    return {
      id: invited.id,
      email: invited.email,
      name: invited.name,
      source: "invite",
    };
  }

  return null;
}

/** Persist a new password hash for the account that owns this email. */
export async function persistPasswordForEmail(
  email: string,
  passwordHash: string,
): Promise<{ ok: true; source: "postgres" | "invite" } | { ok: false }> {
  const normalized = email.trim().toLowerCase();

  if (usersBackendEnabled()) {
    const db = getDb();
    const updated = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.email, normalized))
      .returning({ id: users.id });
    if (updated[0]) {
      return { ok: true, source: "postgres" };
    }
  }

  const invitedOk = updateInvitedUserPasswordHash(normalized, passwordHash);
  if (invitedOk) {
    return { ok: true, source: "invite" };
  }

  return { ok: false };
}
