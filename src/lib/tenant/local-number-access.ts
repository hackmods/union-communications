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
 * Who may find-or-create a local by number or pick any local in the union.
 * Division admins and presidents are excluded (presidents stay session-local).
 */
export function canElevateLocalNumber(roles: readonly string[]): boolean {
  return roles.some((r) => ["platform_admin", "union_admin"].includes(r));
}

export function isPlatformAdminRole(roles: readonly string[]): boolean {
  return roles.includes("platform_admin" satisfies UserRole);
}
