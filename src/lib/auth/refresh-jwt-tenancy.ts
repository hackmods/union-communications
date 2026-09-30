import { eq } from "drizzle-orm";
import type { JWT } from "next-auth/jwt";
import type { UserRole } from "@/types/tenant";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";
import { accountRequiresMfa, hostedCustomerProfileEnabled } from "@/lib/auth/mfa-requirements";

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
 * → ON DELETE SET NULL, or assign-local / role changes). Server-driven only —
 * never trusts client-supplied unionId.
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
        email: users.email,
        unionId: users.unionId,
        divisionId: users.divisionId,
        localId: users.localId,
        bargainingUnitId: users.bargainingUnitId,
        accessibleLocalIds: users.accessibleLocalIds,
        roles: users.roles,
        mfaEnabled: users.mfaEnabled,
        totpSecret: users.totpSecret,
        sessionVersion: users.sessionVersion,
        archivedAt: users.archivedAt,
        lockedAt: users.lockedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row || row.archivedAt || row.lockedAt) {
      if (hostedCustomerProfileEnabled(process.env)) {
        token.mfaRequired = true;
        token.mfaVerified = false;
      }
      return token;
    }

    const versionAhead = row.sessionVersion > tokenVersion;
    const roles = (row.roles as UserRole[]) ?? [];
    const tokenRoles = (token.roles as UserRole[] | undefined) ?? [];
    const rolesDrift =
      roles.length !== tokenRoles.length ||
      roles.some((role) => !tokenRoles.includes(role));
    const tenancyDrift =
      !sameOptionalString(row.unionId, token.unionId) ||
      !sameOptionalString(row.localId, token.localId) ||
      !sameOptionalString(row.divisionId, token.divisionId);
    const explicitMfaEnabled = row.mfaEnabled || Boolean(row.totpSecret);
    const hostedCustomerMode = hostedCustomerProfileEnabled(process.env);
    const legacyRequiresMfa =
      explicitMfaEnabled ||
      token.mfaRequired === true ||
      (!hostedCustomerMode &&
        token.mfaRequired === undefined &&
        ["true", "1", "yes"].includes(
          process.env.AUTH_MFA_ENABLED?.trim().toLowerCase() ?? "",
        ));
    const mfaRequired = accountRequiresMfa({
      email: row.email,
      roles,
      explicitMfaEnabled,
      legacyRequiresMfa,
      hostedCustomerMode,
    });
    const mfaRequirementIncreased = mfaRequired && token.mfaRequired !== true;
    if (!versionAhead && !rolesDrift && !tenancyDrift && token.mfaRequired === mfaRequired) return token;

    token.email = row.email;
    token.unionId = row.unionId ?? undefined;
    token.divisionId = row.divisionId ?? undefined;
    token.localId = row.localId ?? undefined;
    token.bargainingUnitId = row.bargainingUnitId ?? undefined;
    token.accessibleLocalIds = row.accessibleLocalIds ?? undefined;
    token.roles = roles;
    token.sessionVersion = row.sessionVersion;
    token.mfaRequired = mfaRequired;
    if (versionAhead || rolesDrift || mfaRequirementIncreased) {
      token.mfaVerified = false;
    }
  } catch {
    // Hosted profile must not retain privileged access on stale role/session
    // claims when the durable account check is unavailable.
    if (hostedCustomerProfileEnabled(process.env)) {
      token.mfaRequired = true;
      token.mfaVerified = false;
    }
  }

  return token;
}
