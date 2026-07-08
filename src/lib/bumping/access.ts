import type { UserRole } from "@/types/tenant";
import type { BumpingCase } from "@/types/bumping";

const BUMPING_READ_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_steward",
  "local_exec",
  "stability_member",
];

const BUMPING_WRITE_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "stability_member",
];

export function canAccessBumpingModule(roles: UserRole[]): boolean {
  return roles.some((r) => BUMPING_READ_ROLES.includes(r));
}

export function canWriteBumping(roles: UserRole[]): boolean {
  return roles.some((r) => BUMPING_WRITE_ROLES.includes(r));
}

export function canViewBumpingCase(
  bumpingCase: BumpingCase,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canAccessBumpingModule(roles)) return false;
  if (!unionId || bumpingCase.unionId !== unionId) return false;
  if (localId && bumpingCase.localId !== localId) return false;
  return true;
}

export function canEditBumpingCase(
  bumpingCase: BumpingCase,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canViewBumpingCase(bumpingCase, unionId, localId, roles)) return false;
  return canWriteBumping(roles);
}
