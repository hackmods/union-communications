import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertExpenseView,
  requireExpenseSession,
} from "@/lib/auth/expenses-session";
import { canElevateExpenses } from "@/lib/expenses/access";
import { expenseStore } from "@/lib/expenses/store";
import { ledgerStore } from "@/lib/ledger/store";
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
  if (!canElevateExpenses(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await expenseStore.getById(id);
  if (!existing || !assertExpenseView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "submitted") {
    return NextResponse.json(
      { error: "Only submitted expenses can be approved" },
      { status: 409 },
    );
  }

  const ledgerEntry = await ledgerStore.create(
    {
      date: new Date().toISOString().slice(0, 10),
      description: `Union business reimbursement: ${existing.title}`,
      amount: existing.totalAmount,
      type: "expense",
      category: "union_business",
    },
    {
      unionId: existing.unionId,
      localId: existing.localId,
      recordedById: session.user.id,
    },
  );

  const submission = await expenseStore.approve(id, {
    approvedById: session.user.id,
    ledgerEntryId: ledgerEntry.id,
  });
  if (!submission) {
    return NextResponse.json({ error: "Could not approve" }, { status: 409 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "expenses.approve",
    resourceType: "expense_submission",
    resourceId: submission.id,
    unionId: submission.unionId,
    localId: submission.localId,
  });

  return NextResponse.json({ submission, ledgerEntryId: ledgerEntry.id });
}
