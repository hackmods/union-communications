import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForExpenseSession,
  requireExpenseSession,
  tenantIdsForExpenseSession,
} from "@/lib/auth/expenses-session";
import { canCreateExpenseSubmission } from "@/lib/expenses/access";
import { expenseStore } from "@/lib/expenses/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createExpenseSubmissionSchema } from "@/lib/validation/expenses";
import type { ExpenseSubmissionStatus } from "@/types/expenses";
import type { UserRole } from "@/types/tenant";

export async function GET(request: Request) {
  const authResult = await requireExpenseSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const url = new URL(request.url);
  const filters = listFiltersForExpenseSession(session);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "draft" ||
    statusParam === "submitted" ||
    statusParam === "approved" ||
    statusParam === "denied"
      ? (statusParam as ExpenseSubmissionStatus)
      : undefined;
  const mine = url.searchParams.get("mine") === "1";

  const items = await expenseStore.list({
    ...filters,
    status,
    ...(mine ? { submittedById: session.user.id } : {}),
  });

  await auditLog.log({
    userId: session.user.id,
    action: "expenses.list",
    resourceType: "expense_submission",
    resourceId: "*",
    unionId: filters.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const authResult = await requireExpenseSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canCreateExpenseSubmission(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.user.localId) {
    return NextResponse.json({ error: "Local required" }, { status: 400 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(createExpenseSubmissionSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const tenant = tenantIdsForExpenseSession(session);
  const submission = await expenseStore.create(parsed.data, {
    unionId: tenant.unionId,
    localId: tenant.localId,
    submittedById: session.user.id,
    submittedByName: session.user.name ?? session.user.email ?? "Officer",
  });

  await auditLog.log({
    userId: session.user.id,
    action: "expenses.create",
    resourceType: "expense_submission",
    resourceId: submission.id,
    unionId: submission.unionId,
    localId: submission.localId,
  });

  return NextResponse.json({ submission }, { status: 201 });
}
