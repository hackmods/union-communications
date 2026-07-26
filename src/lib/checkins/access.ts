import type { CheckinSchedule } from "@/types/checkins";
import type { UserRole } from "@/types/tenant";
import { canCrossLocalGrievance } from "@/lib/grievance/access";

const CHECKINS_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_steward",
  "local_exec",
  "stability_member",
  "solo_account",
];

const MANAGE_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
];

export function canAccessCheckinsModule(roles: UserRole[]): boolean {
  return roles.some((r) => CHECKINS_ROLES.includes(r));
}

/** Create / edit / deactivate schedules. */
export function canManageCheckins(roles: UserRole[]): boolean {
  return roles.some((r) => MANAGE_ROLES.includes(r));
}

export function canCrossLocalCheckins(roles: UserRole[]): boolean {
  return canCrossLocalGrievance(roles);
}

export function canViewCheckinSchedule(
  schedule: CheckinSchedule,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canAccessCheckinsModule(roles)) return false;
  if (!unionId || schedule.unionId !== unionId) return false;

  if (roles.includes("solo_account")) {
    return schedule.createdById === userId;
  }

  if (localId && schedule.localId !== localId) {
    if (!canCrossLocalCheckins(roles)) return false;
  }

  return true;
}

export function canAnswerCheckin(
  schedule: CheckinSchedule,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  return canViewCheckinSchedule(schedule, userId, unionId, localId, roles);
}
