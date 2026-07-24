import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertMeetingEventsWrite,
  requireMeetingsSession,
} from "@/lib/auth/meetings-session";
import { meetingsRsvpStore } from "@/lib/meetings/rsvp-store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createUnionMeetingSchema } from "@/lib/validation/meetings-rsvp";

export async function GET() {
  const authResult = await requireMeetingsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const unionId = session.user.unionId!;
  const localId = session.user.localId!;
  const meetings = await meetingsRsvpStore.listMeetings({ unionId, localId });

  await auditLog.log({
    userId: session.user.id,
    action: "meetings.events.list",
    resourceType: "union_meeting",
    resourceId: "*",
    unionId,
    localId,
  });

  return NextResponse.json({ meetings });
}

export async function POST(request: Request) {
  const authResult = await requireMeetingsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  if (!assertMeetingEventsWrite(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(createUnionMeetingSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const meeting = await meetingsRsvpStore.createMeeting(parsed.data, {
    unionId: session.user.unionId!,
    localId: session.user.localId!,
    createdById: session.user.id,
    bargainingUnitId: session.user.bargainingUnitId ?? undefined,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "meetings.events.create",
    resourceType: "union_meeting",
    resourceId: meeting.id,
    unionId: meeting.unionId,
    localId: meeting.localId,
  });

  return NextResponse.json({ meeting }, { status: 201 });
}
