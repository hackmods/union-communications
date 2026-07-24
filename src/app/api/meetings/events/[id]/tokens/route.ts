import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertMeetingEventsWrite,
  assertUnionMeetingView,
  requireMeetingsSession,
} from "@/lib/auth/meetings-session";
import { meetingsRsvpStore } from "@/lib/meetings/rsvp-store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createRsvpTokenSchema } from "@/lib/validation/meetings-rsvp";

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

  let raw: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(createRsvpTokenSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const token = await meetingsRsvpStore.createToken(id, {
    createdById: session.user.id,
    expiresAt: parsed.data.expiresAt,
  });
  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "meetings.events.token.create",
    resourceType: "rsvp_token",
    resourceId: token.id,
    unionId: meeting.unionId,
    localId: meeting.localId,
  });

  return NextResponse.json({ token }, { status: 201 });
}
