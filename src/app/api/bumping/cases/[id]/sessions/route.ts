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
  if (!body.date || !body.agenda) {
    return NextResponse.json(
      { error: "date and agenda are required" },
      { status: 400 },
    );
  }

  const sessionRecord = await bumpingStore.addSession(
    id,
    {
      date: body.date,
      attendees: body.attendees ?? [],
      agenda: body.agenda,
    },
    { createdById: session.user.id },
  );

  await auditLog.log({
    userId: session.user.id,
    action: "bumping.session.create",
    resourceType: "committee_session",
    resourceId: sessionRecord?.id ?? id,
    unionId: existing.bumpingCase.unionId,
    localId: existing.bumpingCase.localId,
  });

  return NextResponse.json({ session: sessionRecord }, { status: 201 });
}
