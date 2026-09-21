import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertGrievanceEdit,
  assertGrievanceView,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { buildIcsEvent } from "@/lib/calendar/ics";
import { grievanceStore } from "@/lib/grievance/store";
import { reportApiFailure } from "@/lib/observability/report-server-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const { id } = await context.params;
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!await assertGrievanceView(actor, data.grievance)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const meetings = await withRlsContext(rls, () => grievanceStore.listMeetings(id));
  return NextResponse.json({ meetings });
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const { id } = await context.params;
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!await assertGrievanceEdit(actor, data.grievance)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, startsAt, endsAt, location, description } = body;
  if (!title || !startsAt || !endsAt) {
    return NextResponse.json(
      { error: "title, startsAt, and endsAt are required" },
      { status: 400 },
    );
  }

  const meeting = await withRlsContext(rls, () =>
    grievanceStore.addMeeting(
      id,
      { title, startsAt, endsAt, location, description },
      {
        unionId: data.grievance.unionId,
        localId: data.grievance.localId,
        createdById: session.user.id,
      },
    ),
  );

  if (!meeting) {
    reportApiFailure(
      new Error("grievanceStore.addMeeting returned null"),
      "/api/grievances/[id]/meetings",
    );
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }

  const ics = buildIcsEvent({
    uid: `${meeting.id}@local-union-hub`,
    title: meeting.title,
    description: meeting.description,
    location: meeting.location,
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
    organizerName: session.user.name ?? undefined,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.meeting.create",
    resourceType: "grievance",
    resourceId: id,
    unionId: data.grievance.unionId,
    localId: data.grievance.localId,
  });

  return NextResponse.json({ meeting, ics }, { status: 201 });
}
