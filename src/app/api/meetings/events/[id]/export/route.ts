import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertUnionMeetingView,
  requireMeetingsSession,
} from "@/lib/auth/meetings-session";
import { buildRsvpResponsesCsv } from "@/lib/meetings/rsvp-export";
import { meetingsRsvpStore } from "@/lib/meetings/rsvp-store";

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

  await auditLog.log({
    userId: session.user.id,
    action: "meetings.events.export",
    resourceType: "union_meeting",
    resourceId: meeting.id,
    unionId: meeting.unionId,
    localId: meeting.localId,
  });

  const csv = buildRsvpResponsesCsv({ meeting, responses });
  const safeTitle = meeting.title.replace(/[^\w.-]+/g, "_").slice(0, 40);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsvp-${safeTitle}.csv"`,
    },
  });
}
