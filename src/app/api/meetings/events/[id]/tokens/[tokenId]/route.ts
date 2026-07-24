import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertMeetingEventsWrite,
  assertUnionMeetingView,
  requireMeetingsSession,
} from "@/lib/auth/meetings-session";
import { meetingsRsvpStore } from "@/lib/meetings/rsvp-store";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; tokenId: string }> },
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

  const { id, tokenId } = await context.params;
  const meeting = await meetingsRsvpStore.getMeetingById(id);
  if (!meeting || !assertUnionMeetingView(session, meeting)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tokens = await meetingsRsvpStore.listTokens(id);
  if (!tokens.some((t) => t.id === tokenId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = await meetingsRsvpStore.revokeToken(tokenId);
  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "meetings.events.token.revoke",
    resourceType: "rsvp_token",
    resourceId: token.id,
    unionId: meeting.unionId,
    localId: meeting.localId,
  });

  return NextResponse.json({ token });
}
