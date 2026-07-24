import type { OfficerRosterEntry } from "@/types/officer-roster";
import type { UserRole } from "@/types/tenant";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import { canInitiateHandoff } from "@/lib/handoff/package";

/** President / admin gate — stricter than canManageQolContent (ORG-002). */
export function canManageOfficerRoster(roles: UserRole[]): boolean {
  return canInitiateHandoff(roles);
}

export function canAccessOfficerRoster(roles: UserRole[]): boolean {
  return canManageOfficerRoster(roles);
}

export function canViewOfficerRosterEntry(
  entry: OfficerRosterEntry,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!unionId || entry.unionId !== unionId) return false;
  if (!canAccessOfficerRoster(roles)) return false;
  if (canCrossLocalGrievance(roles)) return true;
  return !localId || entry.localId === localId;
}
