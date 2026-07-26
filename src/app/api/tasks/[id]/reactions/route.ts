import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertTaskView,
  requireTaskSession,
} from "@/lib/auth/task-session";
import { taskStore } from "@/lib/tasks/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { toggleHubReactionSchema } from "@/lib/validation/discussions";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(toggleHubReactionSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const task = await taskStore.toggleReaction(
    id,
    parsed.data.kind,
    authResult.session.user.id,
  );
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "task.reaction",
    resourceType: "task",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ task });
}
