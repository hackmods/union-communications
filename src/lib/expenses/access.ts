import type { ExpenseSubmission } from "@/types/expenses";
import type { UserRole } from "@/types/tenant";
import { canManageQolContent } from "@/lib/qol/access";
import { isElevatedGrievanceRole } from "@/lib/grievance/access";
import { canAccessLedgerModule } from "@/lib/ledger/access";

/** Hub module access — officers who submit or review local purchases. */
export function canAccessExpensesModule(roles: UserRole[]): boolean {
  return canManageQolContent(roles) || canAccessLedgerModule(roles);
}

/** Approve / deny — treasurer/president/elevated (ORG-006 ledger gate). */
export function canElevateExpenses(roles: UserRole[]): boolean {
  return canAccessLedgerModule(roles) || roles.includes("solo_account");
}

export function canCreateExpenseSubmission(roles: UserRole[]): boolean {
  return canAccessExpensesModule(roles);
}

export function canEditDraftExpense(
  submission: ExpenseSubmission,
  userId: string,
  roles: UserRole[],
): boolean {
  if (submission.status !== "draft") return false;
  if (isElevatedGrievanceRole(roles) || roles.includes("solo_account")) {
    return true;
  }
  return submission.submittedById === userId;
}

export function canViewExpenseSubmission(
  submission: ExpenseSubmission,
  unionId: string | undefined,
  localId: string | undefined,
  userId: string,
  roles: UserRole[],
): boolean {
  if (!unionId || submission.unionId !== unionId) return false;
  if (!canAccessExpensesModule(roles)) return false;
  if (isElevatedGrievanceRole(roles) || roles.includes("solo_account")) {
    return true;
  }
  if (canElevateExpenses(roles)) {
    return !localId || submission.localId === localId;
  }
  if (submission.submittedById === userId) return true;
  return !localId || submission.localId === localId;
}

export function canDeleteExpenseSubmission(
  submission: ExpenseSubmission,
  userId: string,
  roles: UserRole[],
): boolean {
  if (submission.status === "approved") return false;
  if (isElevatedGrievanceRole(roles)) return true;
  return (
    submission.submittedById === userId && submission.status === "draft"
  );
}
