import type { Committee } from "@/types/committees";
import type { UserRole } from "@/types/tenant";
import { canCrossLocalGrievance } from "@/lib/authorization/legacy-role-compat";
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
  // A local role without an active local must not inherit union-wide visibility.
  return Boolean(localId && committee.localId === localId);
}
