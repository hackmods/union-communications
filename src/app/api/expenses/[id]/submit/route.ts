import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertExpenseView,
  requireExpenseSession,
} from "@/lib/auth/expenses-session";
import { canEditDraftExpense } from "@/lib/expenses/access";
import { expenseStore } from "@/lib/expenses/store";
import type { UserRole } from "@/types/tenant";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireExpenseSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  const { id } = await context.params;
  const existing = await expenseStore.getById(id);
  if (!existing || !assertExpenseView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canEditDraftExpense(existing, session.user.id, roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submission = await expenseStore.submit(id);
  if (!submission) {
    return NextResponse.json(
      { error: "Only draft submissions can be submitted" },
      { status: 409 },
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "expenses.submit",
    resourceType: "expense_submission",
    resourceId: submission.id,
    unionId: submission.unionId,
    localId: submission.localId,
  });

  return NextResponse.json({ submission });
}
