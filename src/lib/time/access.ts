import type { PtoRequest, TimeEntry, TimeShift } from "@/types/time";
import type { UserRole } from "@/types/tenant";

const TIME_READ_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_steward",
  "local_exec",
  "solo_account",
];

const TIME_CLOCK_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_steward",
  "local_exec",
  "solo_account",
];

const TIME_ADMIN_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
];

const TIME_ELEVATED_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
];

export function canAccessTimeModule(roles: UserRole[]): boolean {
  return roles.some((r) => TIME_READ_ROLES.includes(r));
}

export function canClockTime(roles: UserRole[]): boolean {
  return roles.some((r) => TIME_CLOCK_ROLES.includes(r));
}

export function canAdminTime(roles: UserRole[]): boolean {
  return roles.some((r) => TIME_ADMIN_ROLES.includes(r));
}

export function isElevatedTimeRole(roles: UserRole[]): boolean {
  return roles.some((r) => TIME_ELEVATED_ROLES.includes(r));
}

export function canViewTimeEntry(
  entry: TimeEntry,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canAccessTimeModule(roles)) return false;
  if (!unionId || entry.unionId !== unionId) return false;

  if (isElevatedTimeRole(roles)) return true;

  if (localId && entry.localId !== localId) return false;

  if (canAdminTime(roles)) return true;

  return entry.workerId === userId;
}

export function canApproveTimeEntry(
  entry: TimeEntry,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canViewTimeEntry(entry, userId, unionId, localId, roles)) return false;
  return canAdminTime(roles);
}

export function canSubmitTimeEntry(
  entry: TimeEntry,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canViewTimeEntry(entry, userId, unionId, localId, roles)) return false;
  return entry.workerId === userId && entry.status === "completed";
}

export function canViewPtoRequest(
  req: PtoRequest,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canAccessTimeModule(roles)) return false;
  if (!unionId || req.unionId !== unionId) return false;
  if (isElevatedTimeRole(roles)) return true;
  if (localId && req.localId !== localId) return false;
  if (canAdminTime(roles)) return true;
  return req.workerId === userId || req.requestedById === userId;
}

export function canApprovePtoRequest(
  req: PtoRequest,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canViewPtoRequest(req, userId, unionId, localId, roles)) return false;
  return canAdminTime(roles) && req.status === "submitted";
}

export function canCancelPtoRequest(
  req: PtoRequest,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canViewPtoRequest(req, userId, unionId, localId, roles)) return false;
  if (req.status !== "draft" && req.status !== "submitted") return false;
  return (
    req.workerId === userId ||
    req.requestedById === userId ||
    canAdminTime(roles)
  );
}

export function canViewTimeShift(
  shift: TimeShift,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canAccessTimeModule(roles)) return false;
  if (!unionId || shift.unionId !== unionId) return false;
  if (isElevatedTimeRole(roles)) return true;
  if (localId && shift.localId !== localId) return false;
  if (canAdminTime(roles)) return true;
  return (
    shift.status === "published" && shift.assignedWorkerIds.includes(userId)
  );
}

export function canMutateTimeShift(
  shift: TimeShift,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canViewTimeShift(shift, userId, unionId, localId, roles)) return false;
  return canAdminTime(roles);
}
