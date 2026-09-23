import type {
  InformalLogEntry,
  InformalLogVisibility,
} from "@/types/informal-log";
import type { UserRole } from "@/types/tenant";
import { canManageQolContent } from "@/lib/qol/access";
import {
  canCrossLocalGrievance,
  isElevatedGrievanceRole,
} from "@/lib/authorization/legacy-role-compat";

/** Module access mirrors CA snippet writers (steward / president / elevated). */
export function canAccessInformalLogModule(roles: UserRole[]): boolean {
  return canManageQolContent(roles);
}

export function canCreateInformalLog(roles: UserRole[]): boolean {
  return canManageQolContent(roles);
}

export function canDeleteInformalLog(
  entry: InformalLogEntry,
  userId: string,
  roles: UserRole[],
): boolean {
  if (entry.loggedById === userId) return true;
  return isElevatedGrievanceRole(roles);
}

export function canConvertInformalLog(roles: UserRole[]): boolean {
  return canManageQolContent(roles) && !roles.includes("local_exec");
}

function isPlatformBreakGlass(roles: UserRole[]): boolean {
  return roles.includes("platform_admin");
}

function sameLocal(
  entry: InformalLogEntry,
  localId: string | undefined,
): boolean {
  return Boolean(localId && entry.localId === localId);
}

/**
 * Visibility-aware read check.
 * - private: author only (+ platform_admin break-glass)
 * - local_executive: same-local module writers (stewards + LEC) — preserves shared Quick-Log
 * - area_officer: local_executive OR elevated / cross-local grievance roles
 */
export function canViewInformalLogEntry(
  entry: InformalLogEntry,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
  userId?: string,
): boolean {
  if (!unionId || entry.unionId !== unionId) return false;
  if (!canManageQolContent(roles) && !isPlatformBreakGlass(roles)) return false;

  const visibility: InformalLogVisibility = entry.visibility ?? "local_executive";
  const isAuthor = Boolean(userId && entry.loggedById === userId);

  if (visibility === "private") {
    return isAuthor || isPlatformBreakGlass(roles);
  }

  if (visibility === "area_officer") {
    if (isAuthor) return true;
    if (isPlatformBreakGlass(roles) || canCrossLocalGrievance(roles)) {
      return true;
    }
    if (isElevatedGrievanceRole(roles) && sameLocal(entry, localId)) {
      return true;
    }
    // Same-local stewards still see area_officer entries (local team + area share)
    return sameLocal(entry, localId) && canManageQolContent(roles);
  }

  // local_executive (default): same local module access, or cross-local elevated
  if (isAuthor) return true;
  if (canCrossLocalGrievance(roles) || roles.includes("solo_account")) {
    return true;
  }
  return sameLocal(entry, localId) && canManageQolContent(roles);
}
