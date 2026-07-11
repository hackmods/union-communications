import type { UserRole } from "@/types/tenant";
import { isElevatedGrievanceRole } from "@/lib/grievance/access";
import { canInitiateHandoff as canHandoff } from "@/lib/handoff/package";

/** Roles that may write CA snippets / marketplace templates */
export function canManageQolContent(roles: UserRole[]): boolean {
  return (
    isElevatedGrievanceRole(roles) ||
    roles.includes("solo_account") ||
    roles.includes("local_steward")
  );
}

export function canPublishMarketplace(roles: UserRole[]): boolean {
  return (
    roles.includes("solo_account") ||
    roles.some((r) =>
      [
        "local_president",
        "local_steward",
        "union_admin",
        "division_admin",
        "platform_admin",
      ].includes(r),
    )
  );
}

/** Steward mobile mode: prefer read-first UI; edits still allowed for assigned cases unless forced read-only */
export function isStewardRole(roles: UserRole[]): boolean {
  return roles.includes("local_steward") && !isElevatedGrievanceRole(roles);
}

export function canInitiateHandoff(roles: UserRole[]): boolean {
  return canHandoff(roles);
}

/** Delete shared content: owner or elevated officer */
export function canDeleteSharedContent(
  roles: UserRole[],
  ownerId: string,
  userId: string,
): boolean {
  if (ownerId === userId) return true;
  return roles.some((r) =>
    ["local_president", "union_admin", "division_admin", "platform_admin"].includes(
      r,
    ),
  );
}
