import type { HubModule, UserRole } from "@/types/tenant";
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

/** Roles that treat Officer Hub as home — not rank-and-file members. */
const OFFICER_HOME_ROLES: UserRole[] = [
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

/** Officers see a Hub link in Portal chrome; members stay on Circles. */
export function canSeeOfficerHubLink(roles: UserRole[]): boolean {
  return roles.some((r) => OFFICER_HOME_ROLES.includes(r));
}

/** Rank-and-file: fill Local Portal in the public Header, not Officer Hub. */
export function prefersPortalHome(roles: UserRole[]): boolean {
  return canAccessPortal(roles) && !canSeeOfficerHubLink(roles);
}

/** After sign-in: members land on Together (`/portal`), officers on the Officer Hub. */
export function signedInHomeHref(
  roles: UserRole[],
  enabledModules?: readonly HubModule[],
): "/portal" | "/app" {
  if (enabledModules && !enabledModules.includes("portal")) return "/app";
  return prefersPortalHome(roles) ? "/portal" : "/app";
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
