import type { UserRole } from "@/types/tenant";

/**
 * Who may select or change a Local Number (find-or-create / cross-local assign).
 * Presidents are included but scoped to their session local by callers.
 */
export function canAssignLocalNumber(roles: readonly string[]): boolean {
  return roles.some((r) =>
    ["platform_admin", "union_admin", "local_president"].includes(r),
  );
}

/**
 * Who may mint a local (create_local / find-or-create by number) or pick any
 * local in a union. Site admin only — presidents invite onto an existing local.
 */
export function canMintLocal(roles: readonly string[]): boolean {
  return roles.includes("platform_admin" satisfies UserRole);
}

/**
 * Who may find-or-create a local by number or pick any local in the union.
 * Same gate as minting — platform_admin only.
 */
export function canElevateLocalNumber(roles: readonly string[]): boolean {
  return canMintLocal(roles);
}

export function isPlatformAdminRole(roles: readonly string[]): boolean {
  return roles.includes("platform_admin" satisfies UserRole);
}
