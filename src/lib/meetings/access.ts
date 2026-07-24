import type { UserRole } from "@/types/tenant";
import type { LocalMeetingSchedule, UnionMeeting } from "@/types/meetings";
import { canCrossLocalGrievance } from "@/lib/grievance/access";

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

/** Create/update events, mint/revoke RSVP tokens, enter walk-ins. */
export function canWriteMeetingEvents(roles: UserRole[]): boolean {
  return canWriteMeetingSchedule(roles);
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

export function canViewUnionMeeting(
  meeting: UnionMeeting,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canAccessMeetingsModule(roles)) return false;
  if (!unionId || meeting.unionId !== unionId) return false;
  if (canCrossLocalGrievance(roles)) return true;
  return !localId || meeting.localId === localId;
}
