import type { Session } from "next-auth";
import type { RlsSessionContext } from "@/lib/db/rls-context";
import type { UserRole } from "@/types/tenant";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { isCrossLocalAdministrator, type AuthorizationActor } from "@/lib/authorization/model";

/**
 * Roles that may cross local lines (union/division/platform admins).
 * Mirrors CROSS_LOCAL_ROLES across module access gates — RLS policies set
 * `app.current_cross_local = 'true'` for these so the local_id clause is waived.
 */
const CROSS_LOCAL_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
];

/**
 * Build the RLS session context for an authenticated request.
 * Used to wrap tenant-scoped store calls in `withRlsContext()`.
 * Returns undefined when the session has no union scope (e.g. solo onboarding
 * pre-tenant), so callers can skip wrapping or pass an intent-based scope.
 */
export async function rlsContextForSession(session: Session): Promise<RlsSessionContext | undefined> {
  const actor = await resolveAuthorizationActor(session);
  return rlsContextForActor(session, actor);
}

export function rlsContextForActor(session: Session, actor: AuthorizationActor): RlsSessionContext | undefined {
  const unionId = session.user.unionId;
  if (!unionId) return undefined;
  if (!actor.accountActive) {
    return { unionId: "__inactive_account__", userId: session.user.id, crossLocal: false };
  }
  const roles = actor.roles as UserRole[];
  const crossLocal = actor.source === "database"
    ? isCrossLocalAdministrator(actor)
    : roles.some((r) => CROSS_LOCAL_ROLES.includes(r));
  const localId = session.user.localId;
  const scopedLocalId = localId && (
    crossLocal || actor.memberships.some((membership) =>
      membership.unionId === unionId && membership.localId === localId,
    )
  ) ? localId : undefined;
  return {
    unionId,
    localId: scopedLocalId,
    userId: session.user.id,
    mfaVerified: actor.mfaVerified,
    crossLocal,
  };
}
