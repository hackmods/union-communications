import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertTaskDelete,
  assertTaskEditFields,
  assertTaskMutateAssignment,
  assertTaskView,
  requireTaskSession,
} from "@/lib/auth/task-session";
import { taskStore } from "@/lib/tasks/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateTaskSchema } from "@/lib/validation/task";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireTaskSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const task = await taskStore.getById(id);
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertTaskView(authResult.session, task)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireTaskSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const existing = await taskStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertTaskView(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(updateTaskSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const touchesAssignment =
    input.status !== undefined || input.assigneeId !== undefined;
  const touchesFields =
    input.title !== undefined ||
    input.dueAt !== undefined ||
    input.relatedGrievanceId !== undefined ||
    input.relatedBumpingCaseId !== undefined;

  if (touchesAssignment && !assertTaskMutateAssignment(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (touchesFields && !assertTaskEditFields(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await taskStore.update(id, input);
  await auditLog.log({
    userId: authResult.session.user.id,
    action: "task.update",
    resourceType: "task",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ task: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireTaskSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const existing = await taskStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertTaskDelete(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await taskStore.remove(id);
  await auditLog.log({
    userId: authResult.session.user.id,
    action: "task.delete",
    resourceType: "task",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
