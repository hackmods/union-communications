import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertGrievanceEdit,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { grievanceStore } from "@/lib/grievance/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const existing = await grievanceStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { session } = authResult;
  if (!assertGrievanceEdit(session, existing.grievance)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const note = await grievanceStore.addNote(
    id,
    { body: body.body.trim() },
    {
      authorId: session.user.id,
      authorName: session.user.name ?? session.user.email ?? "Officer",
    },
  );

  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.note.create",
    resourceType: "grievance_note",
    resourceId: note.id,
    unionId: existing.grievance.unionId,
    localId: existing.grievance.localId,
  });

  return NextResponse.json({ note }, { status: 201 });
}
