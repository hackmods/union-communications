import {
  buildOfficerMeetingReminderEmail,
  emailAppBaseUrl,
} from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send";
import type { OfficerRosterEntry } from "@/types/officer-roster";
import type { UnionMeeting } from "@/types/meetings";

export type OfficerReminderJob = {
  meetingId: string;
  unionId: string;
  localId: string;
  to: string;
  subject: string;
  text: string;
};

/** Collect unique officer emails for a local (skip blanks). */
export function officerEmailsForLocal(
  officers: OfficerRosterEntry[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of officers) {
    const email = o.email?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function buildOfficerReminderJobs(input: {
  meetings: UnionMeeting[];
  officersByLocal: Map<string, OfficerRosterEntry[]>;
  origin: string;
}): OfficerReminderJob[] {
  const jobs: OfficerReminderJob[] = [];
  const hubBase = emailAppBaseUrl(input.origin);
  for (const meeting of input.meetings) {
    const key = `${meeting.unionId}::${meeting.localId}`;
    const officers = input.officersByLocal.get(key) ?? [];
    const emails = officerEmailsForLocal(officers);
    const copy = buildOfficerMeetingReminderEmail({
      title: meeting.title,
      startsAt: meeting.startsAt,
      location: meeting.location,
      meetingUrl: `${hubBase}/app/meetings`,
    });
    for (const to of emails) {
      jobs.push({
        meetingId: meeting.id,
        unionId: meeting.unionId,
        localId: meeting.localId,
        to,
        subject: copy.subject,
        text: copy.text,
      });
    }
  }
  return jobs;
}

export function reminderWindowIso(now: Date, withinDays: number): {
  fromIso: string;
  toIso: string;
} {
  const from = new Date(now);
  const to = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

export async function sendOfficerReminderJobs(
  jobs: OfficerReminderJob[],
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const job of jobs) {
    const result = await sendTransactionalEmail({
      to: job.to,
      subject: job.subject,
      text: job.text,
    });
    if (result.ok) {
      sent += 1;
    } else if (result.reason === "not_configured") {
      skipped += 1;
    } else {
      failed += 1;
    }
  }
  return { sent, failed, skipped };
}

export function assertCronSecret(
  headerValue: string | null,
  expected: string | undefined,
): boolean {
  if (!expected?.trim()) return false;
  if (!headerValue) return false;
  const raw = headerValue.trim();
  const token = raw.toLowerCase().startsWith("bearer ")
    ? raw.slice(7).trim()
    : raw;
  return token.length > 0 && token === expected.trim();
}

/** Parse `?dryRun=1` or `?dryRun=true` from cron query params. */
export function parseCronDryRun(searchParams: URLSearchParams): boolean {
  const value = searchParams.get("dryRun");
  return value === "1" || value === "true";
}

/** Parse `?days=N` for cron reminder window (1–30, default 7). */
export function parseCronWithinDays(searchParams: URLSearchParams): number {
  const daysRaw = Number(searchParams.get("days") ?? "7");
  return Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 30 ? daysRaw : 7;
}

export function buildCronDryRunPayload(input: {
  withinDays: number;
  fromIso: string;
  toIso: string;
  meetings: number;
  jobs: OfficerReminderJob[];
}) {
  return {
    ok: true as const,
    dryRun: true as const,
    withinDays: input.withinDays,
    fromIso: input.fromIso,
    toIso: input.toIso,
    meetings: input.meetings,
    jobs: input.jobs.length,
    preview: input.jobs.map((j) => ({
      meetingId: j.meetingId,
      to: j.to,
      subject: j.subject,
    })),
  };
}
