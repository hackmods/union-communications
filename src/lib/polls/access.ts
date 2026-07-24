import type { PollDefinition } from "@/types/polls";
import type { UserRole } from "@/types/tenant";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import { canManageQolContent } from "@/lib/qol/access";

/** Officer access — same tier as CA snippets (FUTURE-006 blueprint). */
export function canAccessPollsModule(roles: UserRole[]): boolean {
  return canManageQolContent(roles);
}

export function canMutatePolls(roles: UserRole[]): boolean {
  return canAccessPollsModule(roles);
}

export function canViewPoll(
  poll: PollDefinition,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!unionId || poll.unionId !== unionId) return false;
  if (!canAccessPollsModule(roles)) return false;
  if (canCrossLocalGrievance(roles)) return true;
  return !localId || poll.localId === localId;
}
