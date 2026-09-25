import { eq } from "drizzle-orm";
import type { JWT } from "next-auth/jwt";
import type { UserRole } from "@/types/tenant";
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

function sameOptionalString(
  a: string | null | undefined,
  b: unknown,
): boolean {
  const left = a ?? undefined;
  const right = typeof b === "string" ? b : undefined;
  return left === right;
}

/**
 * Reload tenancy + roles from Postgres `users` when sessionVersion is ahead
 * or when JWT union/local claims diverge from the DB row (e.g. union deleted
 * → ON DELETE SET NULL). Server-driven only — never trusts client unionId.
 */
export async function refreshJwtTenancyIfStale(token: JWT): Promise<JWT> {
  if (!usersBackendEnabled()) return token;
  const userId = typeof token.sub === "string" ? token.sub : null;
  if (!userId) return token;

  const tokenVersion =
    typeof token.sessionVersion === "number" ? token.sessionVersion : 0;

  try {
    const db = getDb();
    const [row] = await db
      .select({
        unionId: users.unionId,
        divisionId: users.divisionId,
        localId: users.localId,
        bargainingUnitId: users.bargainingUnitId,
        accessibleLocalIds: users.accessibleLocalIds,
        roles: users.roles,
        sessionVersion: users.sessionVersion,
        archivedAt: users.archivedAt,
        lockedAt: users.lockedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row || row.archivedAt || row.lockedAt) return token;

    const versionAhead = row.sessionVersion > tokenVersion;
    const tenancyDrift =
      !sameOptionalString(row.unionId, token.unionId) ||
      !sameOptionalString(row.localId, token.localId) ||
      !sameOptionalString(row.divisionId, token.divisionId);
    if (!versionAhead && !tenancyDrift) return token;

    token.unionId = row.unionId ?? undefined;
    token.divisionId = row.divisionId ?? undefined;
    token.localId = row.localId ?? undefined;
    token.bargainingUnitId = row.bargainingUnitId ?? undefined;
    token.accessibleLocalIds = row.accessibleLocalIds ?? undefined;
    token.roles = (row.roles as UserRole[]) ?? [];
    token.sessionVersion = row.sessionVersion;
  } catch {
    // Fail open on lookup errors — keep existing claims; next request retries.
  }

  return token;
}
