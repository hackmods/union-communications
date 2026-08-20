import type { UserRole } from "@/types/tenant";

/** Create / edit locals + collections for the signed-in union. */
export function canManageTenantOnboarding(roles: string[]): boolean {
  return roles.some((r) =>
    ["local_president", "union_admin", "platform_admin"].includes(r),
  );
}

/** Provision a brand-new union seed (never copies OPSEU). */
export function canCreateUnionTenant(roles: string[]): boolean {
  return roles.includes("platform_admin");
}

export function canManageInvites(roles: string[]): boolean {
  return roles.some((r) =>
    [
      "local_president",
      "union_admin",
      "division_admin",
      "platform_admin",
    ].includes(r),
  );
}

/** Operator path: invite a local president onto a (possibly new) local. */
export function canInvitePresidents(roles: string[]): boolean {
  return roles.some((r) =>
    ["platform_admin", "union_admin", "division_admin"].includes(r),
  );
}

export type InviteRoleOption = Extract<
  UserRole,
  | "local_steward"
  | "local_exec"
  | "local_president"
  | "stability_member"
  | "local_member"
  | "union_admin"
  | "division_admin"
>;

const PRESIDENT_INVITE_ROLES: InviteRoleOption[] = [
  "local_exec",
  "local_steward",
  "stability_member",
  "local_member",
];

const ELEVATED_INVITE_ROLES: InviteRoleOption[] = [
  "local_president",
  ...PRESIDENT_INVITE_ROLES,
];

const PLATFORM_INVITE_ROLES: InviteRoleOption[] = [
  "union_admin",
  "division_admin",
  ...ELEVATED_INVITE_ROLES,
];

/** Full catalog — filter with `inviteRolesForActor` before showing in UI. */
export const INVITE_ROLE_OPTIONS: InviteRoleOption[] = PLATFORM_INVITE_ROLES;

export function inviteRolesForActor(roles: string[]): InviteRoleOption[] {
  if (roles.includes("platform_admin")) return [...PLATFORM_INVITE_ROLES];
  if (roles.includes("union_admin") || roles.includes("division_admin")) {
    return [...ELEVATED_INVITE_ROLES];
  }
  if (roles.includes("local_president")) return [...PRESIDENT_INVITE_ROLES];
  return [];
}

export function canInviteRoles(
  actorRoles: string[],
  requested: string[],
): boolean {
  if (requested.length === 0) return false;
  const allowed = new Set(inviteRolesForActor(actorRoles));
  return requested.every((role) => allowed.has(role as InviteRoleOption));
}
