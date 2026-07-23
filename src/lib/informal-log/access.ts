import type { InformalLogEntry } from "@/types/informal-log";
import type { UserRole } from "@/types/tenant";
import { canManageQolContent } from "@/lib/qol/access";
import { isElevatedGrievanceRole } from "@/lib/grievance/access";

/** Module access mirrors CA snippet writers (steward / president / elevated). */
export function canAccessInformalLogModule(roles: UserRole[]): boolean {
  return canManageQolContent(roles);
}

export function canCreateInformalLog(roles: UserRole[]): boolean {
  return canManageQolContent(roles);
}

export function canDeleteInformalLog(
  entry: InformalLogEntry,
  userId: string,
  roles: UserRole[],
): boolean {
  if (entry.loggedById === userId) return true;
  return isElevatedGrievanceRole(roles);
}

export function canConvertInformalLog(roles: UserRole[]): boolean {
  return canManageQolContent(roles) && !roles.includes("local_exec");
}

export function canViewInformalLogEntry(
  entry: InformalLogEntry,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!unionId || entry.unionId !== unionId) return false;
  if (!canManageQolContent(roles)) return false;
  if (isElevatedGrievanceRole(roles) || roles.includes("solo_account")) {
    return true;
  }
  return !localId || entry.localId === localId;
}
