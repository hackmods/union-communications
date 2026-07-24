import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertUnionMeetingView,
  requireMeetingsSession,
} from "@/lib/auth/meetings-session";
import {
  buildOfficerMeetingReminderEmail,
  emailAppBaseUrl,
} from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send";
import { meetingsRsvpStore } from "@/lib/meetings/rsvp-store";

/**
 * Officer-only one-shot reminder to session.user.email (never a broadcast list).
 * POST /api/meetings/events/[id]/remind-email
 */
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
  const to = session.user.email?.trim();
  if (!to) {
    return NextResponse.json(
      { error: "Session has no email address" },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const meeting = await meetingsRsvpStore.getMeetingById(id);
  if (!meeting || !assertUnionMeetingView(session, meeting)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const copy = buildOfficerMeetingReminderEmail({
    title: meeting.title,
    startsAt: meeting.startsAt,
    location: meeting.location,
    meetingUrl: `${emailAppBaseUrl(origin)}/app/meetings`,
  });

  const result = await sendTransactionalEmail({
    to,
    subject: copy.subject,
    text: copy.text,
  });

  await auditLog.log({
    userId: session.user.id,
    action: result.ok
      ? "email.meeting_reminder"
      : "email.meeting_reminder_skipped",
    resourceType: "union_meeting",
    resourceId: meeting.id,
    unionId: meeting.unionId,
    localId: meeting.localId,
    metadata: {
      to,
      ...(result.ok
        ? { messageId: result.messageId ?? "" }
        : { reason: result.reason }),
    },
  });

  if (!result.ok) {
    const status = result.reason === "not_configured" ? 503 : 502;
    return NextResponse.json(
      { ok: false, reason: result.reason, error: result.error },
      { status },
    );
  }

  return NextResponse.json({ ok: true, messageId: result.messageId });
}
