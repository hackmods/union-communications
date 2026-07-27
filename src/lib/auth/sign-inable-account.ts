/**
 * Accounts eligible for magic sign-in links (Postgres, invitees, demo roster
 * when demo auth is enabled).
 */

import { eq } from "drizzle-orm";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { isDemoAuthEnabled } from "@/lib/auth/demo-auth-gate";
import {
  findInvitedUserRecordByEmail,
  findInvitedUserRecordById,
} from "@/lib/auth/invites";
import type { AuthAccount } from "@/lib/auth/find-db-user";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";
import type { UserRole } from "@/types/tenant";

export type SignInableAccount = {
  id: string;
  email: string;
  name: string;
  source: "postgres" | "invite" | "demo";
};

function usersBackendEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    isPostgresConfigured(env)
  );
}

export async function findSignInableAccountByEmail(
  email: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<SignInableAccount | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  if (usersBackendEnabled(env)) {
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
    if (rows[0]) {
      return {
        id: rows[0].id,
        email: rows[0].email,
        name: rows[0].name,
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

  if (isDemoAuthEnabled(env)) {
    const demo = DEMO_USERS.find((u) => u.email.toLowerCase() === normalized);
    if (demo) {
      return {
        id: demo.id,
        email: demo.email,
        name: demo.name,
        source: "demo",
      };
    }
  }

  return null;
}

/** Resolve full auth account after a magic-link grant is consumed. */
export async function loadAuthAccountById(
  userId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AuthAccount | null> {
  if (usersBackendEnabled(env)) {
    const db = getDb();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const row = rows[0];
    if (row) {
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        unionId: row.unionId ?? undefined,
        divisionId: row.divisionId ?? undefined,
        localId: row.localId ?? undefined,
        bargainingUnitId: row.bargainingUnitId ?? undefined,
        accessibleLocalIds: row.accessibleLocalIds ?? undefined,
        roles: row.roles as UserRole[],
        requiresMfa: row.mfaEnabled || Boolean(row.totpSecret),
        totpSecret: row.totpSecret,
      };
    }
  }

  const invited = findInvitedUserRecordById(userId);
  if (invited) {
    return {
      id: invited.id,
      email: invited.email,
      name: invited.name,
      unionId: invited.unionId,
      divisionId: invited.divisionId,
      localId: invited.localId,
      bargainingUnitId: invited.bargainingUnitId,
      roles: invited.roles,
      requiresMfa: invited.requiresMfa,
    };
  }

  const demo = DEMO_USERS.find((u) => u.id === userId);
  if (demo && isDemoAuthEnabled(env)) {
    return {
      id: demo.id,
      email: demo.email,
      name: demo.name,
      unionId: demo.unionId,
      divisionId: demo.divisionId,
      localId: demo.localId,
      bargainingUnitId: demo.bargainingUnitId,
      accessibleLocalIds: demo.accessibleLocalIds,
      roles: demo.roles,
      requiresMfa: demo.requiresMfa,
      totpSecret: demo.totpSecret,
    };
  }

  return null;
}
