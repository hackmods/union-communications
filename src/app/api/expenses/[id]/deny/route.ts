import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertExpenseView,
  requireExpenseSession,
} from "@/lib/auth/expenses-session";
import { canElevateExpenses } from "@/lib/expenses/access";
import { expenseStore } from "@/lib/expenses/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { denyExpenseSubmissionSchema } from "@/lib/validation/expenses";
import type { UserRole } from "@/types/tenant";

export async function POST(
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
      { error: "Only submitted expenses can be denied" },
      { status: 409 },
    );
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = parseJsonBody(denyExpenseSubmissionSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const submission = await expenseStore.deny(id, {
    deniedById: session.user.id,
    reason: parsed.data.reason,
  });
  if (!submission) {
    return NextResponse.json({ error: "Could not deny" }, { status: 409 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "expenses.deny",
    resourceType: "expense_submission",
    resourceId: submission.id,
    unionId: submission.unionId,
    localId: submission.localId,
  });

  return NextResponse.json({ submission });
}
