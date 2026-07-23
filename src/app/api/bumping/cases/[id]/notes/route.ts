import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertBumpingEdit,
  requireBumpingSession,
} from "@/lib/auth/bumping-session";
import { bumpingStore } from "@/lib/bumping/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireBumpingSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const existing = await bumpingStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { session } = authResult;
  if (!assertBumpingEdit(session, existing.bumpingCase)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const note = await bumpingStore.addNote(
    id,
    { body: body.body.trim(), sessionId: body.sessionId },
    {
      authorId: session.user.id,
      authorName: session.user.name ?? session.user.email ?? "Officer",
    },
  );

  await auditLog.log({
    userId: session.user.id,
    action: "bumping.note.create",
    resourceType: "committee_note",
    resourceId: note?.id ?? id,
    unionId: existing.bumpingCase.unionId,
    localId: existing.bumpingCase.localId,
  });

  return NextResponse.json({ note }, { status: 201 });
}
