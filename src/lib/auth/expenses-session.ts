import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import type { Session } from "next-auth";
import {
  canAccessExpensesModule,
  canViewExpenseSubmission,
} from "@/lib/expenses/access";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import type { ExpenseSubmission } from "@/types/expenses";
import type { UserRole } from "@/types/tenant";

export type ExpenseSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireExpenseSession(): Promise<ExpenseSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessExpensesModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session };
}

export function assertExpenseView(
  session: Session,
  submission: ExpenseSubmission,
): boolean {
  return canViewExpenseSubmission(
    submission,
    session.user.unionId,
    session.user.localId,
    session.user.id,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function listFiltersForExpenseSession(session: Session) {
  const roles = (session.user.roles ?? []) as UserRole[];
  const unionId = session.user.unionId;
  if (!unionId) {
    return { unionId: "__none__", localId: undefined as string | undefined };
  }

  if (roles.includes("solo_account")) {
    return { unionId };
  }

  const crossLocal = canCrossLocalGrievance(roles);
  return {
    unionId,
    localId: session.user.localId,
    ...(crossLocal && !session.user.localId ? { localId: undefined } : {}),
  };
}

export function tenantIdsForExpenseSession(session: Session) {
  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  return { unionId, localId };
}
