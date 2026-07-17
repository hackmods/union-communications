import type { Grievance } from "@/types/grievance";
import type { UserRole } from "@/types/tenant";

const ELEVATED_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
];

const CROSS_LOCAL_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
];

const GRIEVANCE_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_steward",
  "local_exec",
  "solo_account",
];

export function canAccessGrievanceModule(roles: UserRole[]): boolean {
  return roles.some((r) => GRIEVANCE_ROLES.includes(r));
}

export function isElevatedGrievanceRole(roles: UserRole[]): boolean {
  return roles.some((r) => ELEVATED_ROLES.includes(r));
}

export function canCrossLocalGrievance(roles: UserRole[]): boolean {
  return roles.some((r) => CROSS_LOCAL_ROLES.includes(r));
}

export function canViewGrievance(
  grievance: Grievance,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canAccessGrievanceModule(roles)) return false;
  if (grievance.unionId !== unionId) return false;

  if (roles.includes("solo_account")) {
    return (
      grievance.assignedStewardId === userId ||
      grievance.createdById === userId
    );
  }

  // Union/division admins may read across locals. Local officers stay pinned to
  // active session localId (Hub context switcher updates that for multi-local).
  if (localId && grievance.localId !== localId) {
    if (!canCrossLocalGrievance(roles)) return false;
  }

  if (isElevatedGrievanceRole(roles)) return true;

  if (roles.includes("local_steward")) {
    return grievance.assignedStewardId === userId;
  }

  return false;
}

export function canEditGrievance(
  grievance: Grievance,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canViewGrievance(grievance, userId, unionId, localId, roles)) {
    return false;
  }
  if (roles.includes("local_exec")) return false;
  return true;
}
