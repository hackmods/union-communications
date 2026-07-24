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

export type InviteRoleOption = Extract<
  UserRole,
  | "local_steward"
  | "local_exec"
  | "local_president"
  | "stability_member"
  | "union_admin"
  | "division_admin"
>;

export const INVITE_ROLE_OPTIONS: InviteRoleOption[] = [
  "local_steward",
  "local_exec",
  "local_president",
  "stability_member",
  "union_admin",
  "division_admin",
];
