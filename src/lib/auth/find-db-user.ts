import { eq } from "drizzle-orm";
import type { UserRole } from "@/types/tenant";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";
import { verifyPassword } from "@/lib/auth/password";

export type AuthAccount = {
  id: string;
  email: string;
  name: string;
  unionId?: string;
  divisionId?: string;
  localId?: string;
  bargainingUnitId?: string;
  accessibleLocalIds?: string[];
  roles: UserRole[];
  requiresMfa: boolean;
  totpSecret?: string | null;
};

function usersBackendEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    isPostgresConfigured(env)
  );
}

/** Look up a durable user by email + password when AUTH_USERS_BACKEND=postgres. */
export async function findDbUser(
  email: string,
  password: string,
): Promise<AuthAccount | null> {
  if (!usersBackendEnabled()) return null;
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return null;
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
