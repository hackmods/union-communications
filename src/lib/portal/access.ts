import type { UserRole } from "@/types/tenant";
import type { CircleMemberRole } from "@/types/portal";

const PORTAL_ROLES: UserRole[] = [
  "local_member",
  "local_steward",
  "local_exec",
  "local_president",
  "stability_member",
  "union_admin",
  "division_admin",
  "platform_admin",
  "solo_account",
];

export function canAccessPortal(roles: UserRole[]): boolean {
  return roles.some((r) => PORTAL_ROLES.includes(r));
}

export function canCreateCircle(roles: UserRole[]): boolean {
  return roles.some((r) =>
    [
      "local_president",
      "local_exec",
      "union_admin",
      "division_admin",
      "platform_admin",
    ].includes(r),
  );
}

export function canAdminCircle(
  roles: UserRole[],
  membershipRole?: CircleMemberRole,
): boolean {
  if (membershipRole === "admin") return true;
  return canCreateCircle(roles);
}

export function canWriteCircle(membershipRole?: CircleMemberRole): boolean {
  return membershipRole === "member" || membershipRole === "admin";
}

/** Guest = viewer — read-only Circle access. */
export function isCircleGuest(membershipRole?: CircleMemberRole): boolean {
  return membershipRole === "viewer";
}

export const PORTAL_TOOL_MUTES = [
  "bulletin",
  "actions",
  "floor",
  "rollCall",
  "pipeline",
] as const;
