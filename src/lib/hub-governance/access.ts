import type { UserRole } from "@/types/tenant";

const READ_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
  "local_steward",
  "solo_account",
];

const WRITE_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "local_president",
  "local_exec",
  "solo_account",
];

export function canAccessBylawsModule(
  roles: readonly UserRole[],
  enabledModules: readonly string[],
): boolean {
  if (!enabledModules.includes("bylaws")) return false;
  return roles.some((r) => READ_ROLES.includes(r));
}

export function canWriteBylaws(
  roles: readonly UserRole[],
  enabledModules: readonly string[],
): boolean {
  if (!enabledModules.includes("bylaws")) return false;
  return roles.some((r) => WRITE_ROLES.includes(r));
}

export function canAccessProposalsModule(
  roles: readonly UserRole[],
  enabledModules: readonly string[],
): boolean {
  if (!enabledModules.includes("proposals")) return false;
  return roles.some((r) => READ_ROLES.includes(r));
}

export function canWriteProposals(
  roles: readonly UserRole[],
  enabledModules: readonly string[],
): boolean {
  if (!enabledModules.includes("proposals")) return false;
  return roles.some((r) => WRITE_ROLES.includes(r));
}

export function canPublishProposals(
  roles: readonly UserRole[],
  enabledModules: readonly string[],
): boolean {
  return canWriteProposals(roles, enabledModules);
}
