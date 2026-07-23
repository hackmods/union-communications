import type { DiscussionThread } from "@/types/discussions";
import type { UserRole } from "@/types/tenant";
import { canCrossLocalGrievance } from "@/lib/grievance/access";

const DISCUSSIONS_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_steward",
  "local_exec",
  "stability_member",
  "solo_account",
];

const ELEVATED_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
];

export function canAccessDiscussionsModule(roles: UserRole[]): boolean {
  return roles.some((r) => DISCUSSIONS_ROLES.includes(r));
}

export function isElevatedDiscussionsRole(roles: UserRole[]): boolean {
  return roles.some((r) => ELEVATED_ROLES.includes(r));
}

export function canCrossLocalDiscussions(roles: UserRole[]): boolean {
  return canCrossLocalGrievance(roles);
}

/**
 * Base local-scoped visibility for a thread row (before case-link ACL).
 * Solo accounts see only threads they created.
 */
export function canViewDiscussionThreadBase(
  thread: DiscussionThread,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canAccessDiscussionsModule(roles)) return false;
  if (!unionId || thread.unionId !== unionId) return false;

  if (roles.includes("solo_account")) {
    return thread.createdById === userId;
  }

  if (localId && thread.localId !== localId) {
    if (!canCrossLocalDiscussions(roles)) return false;
  }

  return true;
}

/** Standalone (unlinked) threads: anyone with module access in scope may post. */
export function canPostOnStandaloneThread(
  thread: DiscussionThread,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  return canViewDiscussionThreadBase(thread, userId, unionId, localId, roles);
}
