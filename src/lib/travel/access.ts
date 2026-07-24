import type {
  ExpenseClaim,
  TravelAuthorization,
} from "@/types/travel";
import type { UserRole } from "@/types/tenant";
import { canManageQolContent } from "@/lib/qol/access";
import { isElevatedGrievanceRole } from "@/lib/grievance/access";
import { canAccessLedgerModule } from "@/lib/ledger/access";

/** Hub module access — stewards/officers who travel or approve. */
export function canAccessTravelModule(roles: UserRole[]): boolean {
  return canManageQolContent(roles) || canAccessLedgerModule(roles);
}

/**
 * Approve / deny / issue advance / reconcile — treasurer/president/elevated
 * (ORG-006 ledger gate + blueprint §1).
 */
export function canElevateTravel(roles: UserRole[]): boolean {
  return canAccessLedgerModule(roles) || roles.includes("solo_account");
}

export function canCreateTravelAuth(roles: UserRole[]): boolean {
  return canAccessTravelModule(roles);
}

export function canEditDraftTravelAuth(
  auth: TravelAuthorization,
  userId: string,
  roles: UserRole[],
): boolean {
  if (auth.status !== "requested") return false;
  if (isElevatedGrievanceRole(roles) || roles.includes("solo_account")) {
    return true;
  }
  return auth.requestedById === userId;
}

export function canEditDraftClaim(
  claim: ExpenseClaim,
  userId: string,
  roles: UserRole[],
): boolean {
  if (claim.status === "reconciled") return false;
  if (isElevatedGrievanceRole(roles) || roles.includes("solo_account")) {
    return true;
  }
  return claim.claimantId === userId;
}

export function canViewTravelAuth(
  auth: TravelAuthorization,
  unionId: string | undefined,
  localId: string | undefined,
  userId: string,
  roles: UserRole[],
): boolean {
  if (!unionId || auth.unionId !== unionId) return false;
  if (!canAccessTravelModule(roles)) return false;
  if (isElevatedGrievanceRole(roles) || roles.includes("solo_account")) {
    return true;
  }
  if (canElevateTravel(roles)) {
    return !localId || auth.localId === localId;
  }
  if (auth.requestedById === userId) return true;
  return !localId || auth.localId === localId;
}

export function canDeleteTravelAuth(
  auth: TravelAuthorization,
  userId: string,
  roles: UserRole[],
): boolean {
  if (auth.status === "approved") return false;
  if (isElevatedGrievanceRole(roles)) return true;
  return auth.requestedById === userId && auth.status === "requested";
}
