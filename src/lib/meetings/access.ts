import type { UserRole } from "@/types/tenant";
import type { LocalMeetingSchedule } from "@/types/meetings";

const MEETINGS_WRITE_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
];

/** Any authenticated hub user with a union can view their local's schedule + banner. */
export function canAccessMeetingsModule(roles: UserRole[]): boolean {
  return roles.length > 0;
}

export function canWriteMeetingSchedule(roles: UserRole[]): boolean {
  return roles.some((r) => MEETINGS_WRITE_ROLES.includes(r));
}

export function canViewMeetingSchedule(
  schedule: LocalMeetingSchedule,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canAccessMeetingsModule(roles)) return false;
  if (!unionId || schedule.unionId !== unionId) return false;
  if (localId && schedule.localId !== localId) return false;
  return true;
}
