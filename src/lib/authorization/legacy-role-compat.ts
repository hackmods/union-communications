import type { UserRole } from "@/types/tenant";

/**
 * Transitional helpers for older feature policies that still receive role
 * arrays. New authorization decisions should use resolved actors and typed
 * capabilities from `model.ts` instead.
 */
const LEGACY_ELEVATED_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
];

const LEGACY_CROSS_LOCAL_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
];

export function isElevatedGrievanceRole(roles: UserRole[]): boolean {
  return roles.some((role) => LEGACY_ELEVATED_ROLES.includes(role));
}

export function canCrossLocalGrievance(roles: UserRole[]): boolean {
  return roles.some((role) => LEGACY_CROSS_LOCAL_ROLES.includes(role));
}
