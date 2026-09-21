import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import type { Session } from "next-auth";
import {
  canAccessCommitteesModule,
  canViewCommittee,
} from "@/lib/committees/access";
import { canCrossLocalGrievance } from "@/lib/authorization/legacy-role-compat";
import { localScopeFilter } from "@/lib/authorization/scope-filter";
import { withRlsContext, type RlsSessionContext } from "@/lib/db/rls-context";
import type { Committee } from "@/types/committees";
import type { UserRole } from "@/types/tenant";

export type CommitteesSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireCommitteesSession(): Promise<CommitteesSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessCommitteesModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!session.user.localId && !canCrossLocalGrievance(roles)) {
    return { ok: false, status: 403, error: "Local context required" };
  }
  return { ok: true, session };
}

export function assertCommitteeView(
  session: Session,
  committee: Committee,
): boolean {
  return canViewCommittee(
    committee,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function listFiltersForCommitteesSession(session: Session) {
  const roles = (session.user.roles ?? []) as UserRole[];
  const unionId = session.user.unionId;
  if (!unionId) {
    return { unionId: "__none__", localId: undefined as string | undefined };
  }

  const crossLocal = canCrossLocalGrievance(roles);
  return {
    unionId,
    // Local actors with missing context never turn an omitted filter into a
    // union-wide query. Cross-local administrators may intentionally omit it.
    localId: localScopeFilter(session.user.localId, crossLocal),
  };
}

export function tenantIdsForCommitteesSession(session: Session) {
  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  return { unionId, localId };
}

/**
 * Committee routes carry the authenticated actor into RLS explicitly. The
 * store adapter intentionally does not create a second, incomplete context.
 */
export function withCommitteesRls<T>(
  session: Session,
  fn: () => Promise<T>,
  localId: string | undefined = session.user.localId ?? undefined,
): Promise<T> {
  const roles = (session.user.roles ?? []) as UserRole[];
  const context: RlsSessionContext = {
    unionId: session.user.unionId ?? undefined,
    localId,
    userId: session.user.id,
    crossLocal: canCrossLocalGrievance(roles),
    mfaVerified: sessionMfaOk(session),
  };
  return withRlsContext(context, fn);
}
