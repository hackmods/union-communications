import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertMeetingEventsWrite,
  assertUnionMeetingView,
  requireMeetingsSession,
} from "@/lib/auth/meetings-session";
import { meetingsRsvpStore } from "@/lib/meetings/rsvp-store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateUnionMeetingSchema } from "@/lib/validation/meetings-rsvp";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireMeetingsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const { id } = await context.params;
  const meeting = await meetingsRsvpStore.getMeetingById(id);
  if (!meeting || !assertUnionMeetingView(session, meeting)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [tokens, responses, tallies] = await Promise.all([
    meetingsRsvpStore.listTokens(id),
    meetingsRsvpStore.listResponses(id),
    meetingsRsvpStore.tallies(id),
  ]);

  await auditLog.log({
    userId: session.user.id,
    action: "meetings.events.view",
    resourceType: "union_meeting",
    resourceId: meeting.id,
    unionId: meeting.unionId,
    localId: meeting.localId,
  });

  return NextResponse.json({ meeting, tokens, responses, tallies });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const existing = await meetingsRsvpStore.getMeetingById(id);
  if (!existing || !assertUnionMeetingView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(updateUnionMeetingSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const meeting = await meetingsRsvpStore.updateMeeting(id, parsed.data);
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "meetings.events.update",
    resourceType: "union_meeting",
    resourceId: meeting.id,
    unionId: meeting.unionId,
    localId: meeting.localId,
  });

  return NextResponse.json({ meeting });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const existing = await meetingsRsvpStore.getMeetingById(id);
  if (!existing || !assertUnionMeetingView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ok = await meetingsRsvpStore.deleteMeeting(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "meetings.events.delete",
    resourceType: "union_meeting",
    resourceId: existing.id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
