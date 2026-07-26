import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertExpenseView,
  requireExpenseSession,
} from "@/lib/auth/expenses-session";
import {
  canDeleteExpenseSubmission,
  canEditDraftExpense,
} from "@/lib/expenses/access";
import { expenseStore } from "@/lib/expenses/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateExpenseSubmissionSchema } from "@/lib/validation/expenses";
import type { UserRole } from "@/types/tenant";

export async function GET(
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
  const { id } = await context.params;
  const submission = await expenseStore.getById(id);
  if (!submission || !assertExpenseView(session, submission)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ submission });
}

export async function PATCH(
  request: Request,
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

  const raw = await request.json();
  const parsed = parseJsonBody(updateExpenseSubmissionSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const submission = await expenseStore.update(id, parsed.data);
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "expenses.update",
    resourceType: "expense_submission",
    resourceId: submission.id,
    unionId: submission.unionId,
    localId: submission.localId,
  });

  return NextResponse.json({ submission });
}

export async function DELETE(
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
  if (!canDeleteExpenseSubmission(existing, session.user.id, roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await expenseStore.remove(id);
  if (!ok) {
    return NextResponse.json({ error: "Cannot delete" }, { status: 409 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "expenses.delete",
    resourceType: "expense_submission",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
