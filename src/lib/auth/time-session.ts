import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import type { Session } from "next-auth";
import {
  canAccessTimeModule,
  canApprovePtoRequest,
  canApproveTimeEntry,
  canCancelPtoRequest,
  canMutateTimeShift,
  canViewPtoRequest,
  canViewTimeEntry,
  canViewTimeShift,
  isElevatedTimeRole,
} from "@/lib/time/access";
import { getTenantContext } from "@/lib/tenant/loader";
import type { PtoRequest, TimeEntry, TimeShift } from "@/types/time";
import type { UserRole } from "@/types/tenant";

export type TimeSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireTimeSession(): Promise<TimeSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessTimeModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!isTimeModuleEnabled(session)) {
    return { ok: false, status: 403, error: "Module not enabled" };
  }
  return { ok: true, session };
}

export function isTimeModuleEnabled(session: Session): boolean {
  if (!session.user.unionId) return false;
  const tenant = getTenantContext(session.user.unionId);
  return tenant?.union.enabledModules.includes("time") ?? false;
}

export function assertTimeView(session: Session, entry: TimeEntry): boolean {
  return canViewTimeEntry(
    entry,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function assertTimeApprove(session: Session, entry: TimeEntry): boolean {
  return canApproveTimeEntry(
    entry,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function assertPtoView(session: Session, req: PtoRequest): boolean {
  return canViewPtoRequest(
    req,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function assertPtoApprove(session: Session, req: PtoRequest): boolean {
  return canApprovePtoRequest(
    req,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function assertPtoCancel(session: Session, req: PtoRequest): boolean {
  return canCancelPtoRequest(
    req,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function assertShiftView(session: Session, shift: TimeShift): boolean {
  return canViewTimeShift(
    shift,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function assertShiftMutate(session: Session, shift: TimeShift): boolean {
  return canMutateTimeShift(
    shift,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function listFiltersForTimeSession(session: Session) {
  const roles = (session.user.roles ?? []) as UserRole[];
  const elevated = isElevatedTimeRole(roles);
  return {
    unionId: session.user.unionId ?? "__none__",
    localId: elevated ? undefined : session.user.localId,
    workerId: canAdminTimeSession(session) ? undefined : session.user.id,
  };
}

function canAdminTimeSession(session: Session): boolean {
  const roles = (session.user.roles ?? []) as UserRole[];
  return (
    isElevatedTimeRole(roles) ||
    roles.includes("local_president") ||
    roles.includes("local_exec")
  );
}

export function tenantIdsForTimeSession(session: Session) {
  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  return { unionId, localId };
}
