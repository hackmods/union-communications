import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  isElevatedTaskSession,
  listFiltersForTaskSession,
  requireTaskSession,
  tenantIdsForTaskSession,
} from "@/lib/auth/task-session";
import { canAssignOthers, canCreateTask } from "@/lib/tasks/access";
import { taskStore } from "@/lib/tasks/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createTaskSchema } from "@/lib/validation/task";
import type { TaskStatus } from "@/types/task";
import type { UserRole } from "@/types/tenant";

export async function GET(request: Request) {
  const authResult = await requireTaskSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const url = new URL(request.url);
  const filters = listFiltersForTaskSession(session);
  const assigneeId = url.searchParams.get("assigneeId") ?? undefined;
  const status = url.searchParams.get("status") as TaskStatus | null;
  const relatedGrievanceId =
    url.searchParams.get("relatedGrievanceId") ?? undefined;
  const relatedBumpingCaseId =
    url.searchParams.get("relatedBumpingCaseId") ?? undefined;
  const mine = url.searchParams.get("mine") === "1";

  const tasks = await taskStore.list({
    ...filters,
    assigneeId: mine
      ? session.user.id
      : (assigneeId ?? filters.assigneeId),
    status: status === "open" || status === "done" ? status : undefined,
    relatedGrievanceId,
    relatedBumpingCaseId,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "task.list",
    resourceType: "task",
    resourceId: "*",
    unionId: filters.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const authResult = await requireTaskSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canCreateTask(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(createTaskSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const assigneeId = input.assigneeId ?? session.user.id;
  if (assigneeId !== session.user.id && !canAssignOthers(roles)) {
    return NextResponse.json(
      { error: "Only elevated officers may assign others" },
      { status: 403 },
    );
  }

  const tenant = tenantIdsForTaskSession(session);
  if (!session.user.localId && !isElevatedTaskSession(session)) {
    return NextResponse.json({ error: "Local required" }, { status: 400 });
  }

  const task = await taskStore.create(input, {
    unionId: tenant.unionId,
    localId: tenant.localId,
    bargainingUnitId: input.bargainingUnitId ?? tenant.bargainingUnitId,
    createdById: session.user.id,
    assigneeId,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "task.create",
    resourceType: "task",
    resourceId: task.id,
    unionId: task.unionId,
    localId: task.localId,
  });

  return NextResponse.json({ task }, { status: 201 });
}
