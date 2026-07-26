import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import type { Session } from "next-auth";
import {
  canAccessCheckinsModule,
  canCrossLocalCheckins,
  canManageCheckins,
  canViewCheckinSchedule,
} from "@/lib/checkins/access";
import { getTenantContext } from "@/lib/tenant/loader";
import type { CheckinSchedule } from "@/types/checkins";
import type { UserRole } from "@/types/tenant";

export type CheckinsSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireCheckinsSession(): Promise<CheckinsSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessCheckinsModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!isCheckinsModuleEnabled(session)) {
    return { ok: false, status: 403, error: "Module not enabled" };
  }
  return { ok: true, session };
}

export function isCheckinsModuleEnabled(session: Session): boolean {
  if (!session.user.unionId) return false;
  const tenant = getTenantContext(session.user.unionId);
  return tenant?.union.enabledModules.includes("checkins") ?? false;
}

export function listFiltersForCheckinsSession(session: Session) {
  const roles = (session.user.roles ?? []) as UserRole[];
  const unionId = session.user.unionId;
  if (!unionId) {
    return { unionId: "__none__", localId: undefined as string | undefined };
  }

  const crossLocal = canCrossLocalCheckins(roles);
  return {
    unionId,
    localId: session.user.localId,
    bargainingUnitId: session.user.bargainingUnitId,
    ...(crossLocal && !session.user.localId
      ? { localId: undefined, bargainingUnitId: undefined }
      : {}),
  };
}

export function tenantIdsForCheckinsSession(session: Session) {
  const unionId = session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId = session.user.localId ?? `solo-local-${session.user.id}`;
  return { unionId, localId };
}

export function assertCheckinScheduleView(
  session: Session,
  schedule: CheckinSchedule,
): boolean {
  const roles = (session.user.roles ?? []) as UserRole[];
  return canViewCheckinSchedule(
    schedule,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    roles,
  );
}

export function assertCanManageCheckins(session: Session): boolean {
  const roles = (session.user.roles ?? []) as UserRole[];
  return canManageCheckins(roles);
}
