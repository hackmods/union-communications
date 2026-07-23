import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import {
  assertGrievanceEdit,
  assertGrievanceView,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { buildIcsEvent } from "@/lib/calendar/ics";
import { grievanceStore } from "@/lib/grievance/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const data = await grievanceStore.getById(id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertGrievanceView(authResult.session, data.grievance)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const meetings = await grievanceStore.listMeetings(id);
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

  const { id } = await context.params;
  const data = await grievanceStore.getById(id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertGrievanceEdit(authResult.session, data.grievance)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, startsAt, endsAt, location, description } = body;
  if (!title || !startsAt || !endsAt) {
    return NextResponse.json(
      { error: "title, startsAt, and endsAt are required" },
      { status: 400 },
    );
  }

  const { session } = authResult;
  const meeting = await grievanceStore.addMeeting(
    id,
    { title, startsAt, endsAt, location, description },
    {
      unionId: data.grievance.unionId,
      localId: data.grievance.localId,
      createdById: session.user.id,
    },
  );

  if (!meeting) {
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
