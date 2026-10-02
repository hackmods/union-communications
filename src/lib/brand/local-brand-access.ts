import type { UserRole } from "@/types/tenant";

/** Roles that may publish Brand Kit to the Local shared default. */
export function canPublishLocalBrand(roles: UserRole[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((role) =>
    [
      "local_president",
      "union_admin",
      "division_admin",
      "platform_admin",
    ].includes(role),
  );
}
