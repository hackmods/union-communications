import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertTaskDelete,
  assertTaskEditFields,
  assertTaskMutateAssignment,
  assertTaskView,
  requireTaskSession,
} from "@/lib/auth/task-session";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { taskStore } from "@/lib/tasks/store";
import { notifyMentionedUsers, resolveMentionedUserIds } from "@/lib/hub/mention-notify";
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

  const { session } = authResult;
  const rls = await rlsContextForSession(session) ?? {};
  const { id } = await context.params;
  const task = await withRlsContext(rls, () => taskStore.getById(id));
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertTaskView(session, task)) {
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

  const { session } = authResult;
  const rls = await rlsContextForSession(session) ?? {};
  const { id } = await context.params;
  const existing = await withRlsContext(rls, () => taskStore.getById(id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertTaskView(session, existing)) {
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
    input.notes !== undefined ||
    input.dueAt !== undefined ||
    input.relatedGrievanceId !== undefined ||
    input.relatedBumpingCaseId !== undefined;

  if (touchesAssignment && !assertTaskMutateAssignment(session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (touchesFields && !assertTaskEditFields(session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await withRlsContext(rls, async () =>
    taskStore.update(id, {
      ...input,
      ...(input.notes !== undefined
        ? {
            mentionedUserIds: await resolveMentionedUserIds(
              [existing.title, input.notes ?? ""].join("\n"),
              {
                unionId: existing.unionId,
                localId: existing.localId,
                accessibleLocalIds:
                  session.user.accessibleLocalIds ?? undefined,
              },
            ),
          }
        : {}),
    }),
  );

  if (input.notes && updated) {
    await notifyMentionedUsers({
      body: input.notes,
      authorId: session.user.id,
      unionId: existing.unionId,
      localId: existing.localId,
      accessibleLocalIds:
        session.user.accessibleLocalIds ?? undefined,
      source: "task",
      sourceId: id,
    });
  }
  await auditLog.log({
    userId: session.user.id,
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

  const { session } = authResult;
  const rls = await rlsContextForSession(session) ?? {};
  const { id } = await context.params;
  const existing = await withRlsContext(rls, () => taskStore.getById(id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertTaskDelete(session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await withRlsContext(rls, () => taskStore.remove(id));
  await auditLog.log({
    userId: session.user.id,
    action: "task.delete",
    resourceType: "task",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
