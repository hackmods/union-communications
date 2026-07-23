import { auth } from "@/auth";
import type { Session } from "next-auth";
import {
  canAccessInformalLogModule,
  canViewInformalLogEntry,
} from "@/lib/informal-log/access";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import { getTenantContext } from "@/lib/tenant/loader";
import type { InformalLogEntry } from "@/types/informal-log";
import type { UserRole } from "@/types/tenant";

export type InformalLogSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireInformalLogSession(): Promise<InformalLogSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!session.user.mfaVerified) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessInformalLogModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!isInformalLogModuleEnabled(session)) {
    return { ok: false, status: 403, error: "Module not enabled" };
  }
  return { ok: true, session };
}

export function isInformalLogModuleEnabled(session: Session): boolean {
  if (!session.user.unionId) return false;
  const tenant = getTenantContext(session.user.unionId);
  return tenant?.union.enabledModules.includes("informalLog") ?? false;
}

export function assertInformalLogView(
  session: Session,
  entry: InformalLogEntry,
): boolean {
  return canViewInformalLogEntry(
    entry,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function listFiltersForInformalLogSession(session: Session) {
  const roles = (session.user.roles ?? []) as UserRole[];
  const unionId = session.user.unionId;
  if (!unionId) {
    return { unionId: "__none__", localId: undefined };
  }

  if (roles.includes("solo_account")) {
    return { unionId };
  }

  const crossLocal = canCrossLocalGrievance(roles);
  return {
    unionId,
    localId: session.user.localId,
    bargainingUnitId: session.user.bargainingUnitId,
    ...(crossLocal && !session.user.localId
      ? { localId: undefined, bargainingUnitId: undefined }
      : {}),
  };
}

export function tenantIdsForInformalLogSession(session: Session) {
  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  return {
    unionId,
    localId,
    bargainingUnitId: session.user.bargainingUnitId,
  };
}
