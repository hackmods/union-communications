import type { Session } from "next-auth";
import type { RlsSessionContext } from "@/lib/db/rls-context";
import type { UserRole } from "@/types/tenant";

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
export function rlsContextForSession(session: Session): RlsSessionContext | undefined {
  const unionId = session.user.unionId;
  if (!unionId) return undefined;
  const roles = (session.user.roles ?? []) as UserRole[];
  return {
    unionId,
    localId: session.user.localId,
    crossLocal: roles.some((r) => CROSS_LOCAL_ROLES.includes(r)),
  };
}