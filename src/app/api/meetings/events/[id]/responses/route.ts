import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertMeetingEventsWrite,
  assertUnionMeetingView,
  requireMeetingsSession,
} from "@/lib/auth/meetings-session";
import { meetingsRsvpStore } from "@/lib/meetings/rsvp-store";
import { parseJsonBody } from "@/lib/validation/parse";
import { submitWalkInRsvpSchema } from "@/lib/validation/meetings-rsvp";

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

  const responses = await meetingsRsvpStore.listResponses(id);
  const tallies = await meetingsRsvpStore.tallies(id);

  await auditLog.log({
    userId: session.user.id,
    action: "meetings.events.responses.list",
    resourceType: "union_meeting",
    resourceId: meeting.id,
    unionId: meeting.unionId,
    localId: meeting.localId,
  });

  return NextResponse.json({ responses, tallies });
}

export async function POST(
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
  const meeting = await meetingsRsvpStore.getMeetingById(id);
  if (!meeting || !assertUnionMeetingView(session, meeting)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(submitWalkInRsvpSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const result = await meetingsRsvpStore.submitResponse(id, parsed.data, {
    source: "officer_entry",
  });
  if (result.error || !result.response) {
    return NextResponse.json(
      { error: result.error ?? "Submit failed" },
      { status: 400 },
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "meetings.events.responses.walk_in",
    resourceType: "rsvp_response",
    resourceId: result.response.id,
    unionId: meeting.unionId,
    localId: meeting.localId,
  });

  const tallies = await meetingsRsvpStore.tallies(id);
  return NextResponse.json(
    { response: result.response, tallies },
    { status: 201 },
  );
}
