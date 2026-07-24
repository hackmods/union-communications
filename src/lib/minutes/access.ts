import type { MeetingMinutes } from "@/types/minutes";
import type { UserRole } from "@/types/tenant";
import { canManageQolContent } from "@/lib/qol/access";
import { isElevatedGrievanceRole } from "@/lib/grievance/access";

/** Read/write: elevated, president, steward (and solo). */
export function canAccessMinutesModule(roles: UserRole[]): boolean {
  return canManageQolContent(roles);
}

export function canWriteMinutes(roles: UserRole[]): boolean {
  return canManageQolContent(roles);
}

export function canApproveMinutes(roles: UserRole[]): boolean {
  return canManageQolContent(roles);
}

export function canDeleteMinutes(
  minutes: MeetingMinutes,
  userId: string,
  roles: UserRole[],
): boolean {
  if (isElevatedGrievanceRole(roles)) return true;
  if (minutes.status === "approved") return false;
  return minutes.recordedById === userId;
}

export function canViewMinutes(
  minutes: MeetingMinutes,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!unionId || minutes.unionId !== unionId) return false;
  if (!canAccessMinutesModule(roles)) return false;
  if (isElevatedGrievanceRole(roles) || roles.includes("solo_account")) {
    return true;
  }
  return !localId || minutes.localId === localId;
}
