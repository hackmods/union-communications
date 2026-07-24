import type { ElectionCycle } from "@/types/elections";
import type { UserRole } from "@/types/tenant";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import { canInitiateHandoff } from "@/lib/handoff/package";

/** Elevated / president gate — same bar as officer roster (ORG-002). */
export function canAccessElectionsModule(roles: UserRole[]): boolean {
  return canInitiateHandoff(roles);
}

export function canMutateElections(roles: UserRole[]): boolean {
  return canAccessElectionsModule(roles);
}

export function canViewElectionCycle(
  cycle: ElectionCycle,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!unionId || cycle.unionId !== unionId) return false;
  if (!canAccessElectionsModule(roles)) return false;
  if (canCrossLocalGrievance(roles)) return true;
  return !localId || cycle.localId === localId;
}
