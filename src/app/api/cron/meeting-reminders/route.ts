import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertCronSecret,
  buildOfficerReminderJobs,
  parseCronDryRun,
  parseCronWithinDays,
  reminderWindowIso,
  sendOfficerReminderJobs,
} from "@/lib/meetings/officer-reminder-cron";
import { meetingsRsvpStore } from "@/lib/meetings/rsvp-store";
import { officerRosterStore } from "@/lib/officers/store";
import type { OfficerRosterEntry } from "@/types/officer-roster";

/**
 * Opt-in cron: email officers (roster emails only) for Hub events starting soon.
 * Never member broadcast lists (ADR-016).
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` or `x-cron-secret: $CRON_SECRET`
 * Requires `CRON_SECRET` + `EMAIL_ENABLED=true` (+ SMTP) to actually send.
 *
 * GET|POST /api/cron/meeting-reminders?days=7
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  if (
    !assertCronSecret(authHeader, secret) &&
    !assertCronSecret(cronHeader, secret)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const withinDays = parseCronWithinDays(url.searchParams);
  const dryRun = parseCronDryRun(url.searchParams);

  const { fromIso, toIso } = reminderWindowIso(new Date(), withinDays);
  const meetings = await meetingsRsvpStore.listMeetingsInWindow(
    fromIso,
    toIso,
  );

  const officersByLocal = new Map<string, OfficerRosterEntry[]>();
  for (const meeting of meetings) {
    const key = `${meeting.unionId}::${meeting.localId}`;
    if (officersByLocal.has(key)) continue;
    const officers = await officerRosterStore.list({
      unionId: meeting.unionId,
      localId: meeting.localId,
    });
    officersByLocal.set(key, officers);
  }

  const origin = url.origin;
  const jobs = buildOfficerReminderJobs({
    meetings,
    officersByLocal,
    origin,
  });

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      withinDays,
      fromIso,
      toIso,
      meetings: meetings.length,
      jobs: jobs.length,
      preview: jobs.map((j) => ({
        meetingId: j.meetingId,
        to: j.to,
        subject: j.subject,
      })),
    });
  }

  const result = await sendOfficerReminderJobs(jobs);

  await auditLog.log({
    userId: "system-cron",
    action: "email.meeting_reminder_cron",
    resourceType: "union_meeting",
    resourceId: "*",
    metadata: {
      withinDays: String(withinDays),
      meetings: String(meetings.length),
      jobs: String(jobs.length),
      sent: String(result.sent),
      failed: String(result.failed),
      skipped: String(result.skipped),
    },
  });

  return NextResponse.json({
    ok: true,
    withinDays,
    meetings: meetings.length,
    jobs: jobs.length,
    ...result,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
