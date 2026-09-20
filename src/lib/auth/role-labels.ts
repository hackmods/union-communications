import type { UserRole } from "@/types/tenant";

/** Canonical Hub RBAC roles — keep in sync with `UserRole` in `@/types/tenant`. */
export const USER_ROLES = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_steward",
  "local_exec",
  "stability_member",
  "local_member",
  "solo_account",
] as const satisfies readonly UserRole[];

export type RoleLabelKey = (typeof USER_ROLES)[number];

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

/** Fallback when a role id is missing from the message catalog. */
export function humanizeRoleId(role: string): string {
  return role
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type RoleTranslator = {
  (key: string): string;
  has?: (key: string) => boolean;
};

/**
 * Resolve a single role id to a locale display name.
 * Pass a next-intl translator scoped to `hub.roleLabels`.
 */
export function formatRoleLabel(role: string, t: RoleTranslator): string {
  if (typeof t.has === "function" ? t.has(role) : isUserRole(role)) {
    try {
      return t(role);
    } catch {
      return humanizeRoleId(role);
    }
  }
  return humanizeRoleId(role);
}

/** Join role ids into a readable, locale-aware list for Hub UI. */
export function formatRoleList(
  roles: readonly string[],
  t: RoleTranslator,
  separator = ", ",
): string {
  return roles.map((role) => formatRoleLabel(role, t)).join(separator);
}
