import type { Committee } from "@/types/committees";
import type { UserRole } from "@/types/tenant";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import { canInitiateHandoff } from "@/lib/handoff/package";

/** Elevated / president gate — same bar as officer roster (ORG-002). */
export function canAccessCommitteesModule(roles: UserRole[]): boolean {
  return canInitiateHandoff(roles);
}

export function canMutateCommittees(roles: UserRole[]): boolean {
  return canAccessCommitteesModule(roles);
}

export function canViewCommittee(
  committee: Committee,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!unionId || committee.unionId !== unionId) return false;
  if (!canAccessCommitteesModule(roles)) return false;
  if (canCrossLocalGrievance(roles)) return true;
  return !localId || committee.localId === localId;
}
