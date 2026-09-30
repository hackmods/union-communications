import { buildCheckinNudgeEmail, emailAppBaseUrl } from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send";
import { listActiveCheckinSchedulesForCron } from "@/lib/checkins/cron-schedules";
import { listCheckinNudgeRecipients } from "@/lib/checkins/nudge-recipients";
import {
  claimCheckinNudgeSend,
  hasCheckinNudgeBeenSent,
} from "@/lib/checkins/nudge-sends";
import { currentPeriodForSchedule } from "@/lib/checkins/periods";
import { checkinsStore } from "@/lib/checkins/store";
import { getTenantContext } from "@/lib/tenant/loader";
export type CheckinNudgeJob = {
  scheduleId: string;
  unionId: string;
  localId: string;
  periodKey: string;
  userId: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

function isCheckinsEnabledForUnion(unionId: string): boolean {
  const tenant = getTenantContext(unionId);
  return tenant?.union.enabledModules.includes("checkins") ?? false;
}

export async function buildCheckinNudgeJobs(input: {
  origin: string;
  now?: Date;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<{
  schedules: number;
  skippedNoPeriod: number;
  skippedModuleOff: number;
  jobs: CheckinNudgeJob[];
}> {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date();
  const hubBase = emailAppBaseUrl(input.origin);
  const schedules = await listActiveCheckinSchedulesForCron(env);
  const jobs: CheckinNudgeJob[] = [];
  let skippedNoPeriod = 0;
  let skippedModuleOff = 0;

  for (const schedule of schedules) {
    if (!isCheckinsEnabledForUnion(schedule.unionId)) {
      skippedModuleOff += 1;
      continue;
    }
    const period = currentPeriodForSchedule(schedule, now);
    if (!period) {
      skippedNoPeriod += 1;
      continue;
    }

    const recipients = await listCheckinNudgeRecipients(schedule, env);
    for (const recipient of recipients) {
      const existing = await checkinsStore.getAnswer(
        schedule.id,
        period.periodKey,
        recipient.userId,
      );
      if (existing) continue;

      if (
        await hasCheckinNudgeBeenSent(
          schedule.id,
          period.periodKey,
          recipient.userId,
          env,
        )
      ) {
        continue;
      }

      const copy = buildCheckinNudgeEmail({
        question: schedule.question,
        periodLabel: period.periodLabel,
        checkinUrl: `${hubBase}/app/checkins/${schedule.id}`,
      });
      jobs.push({
        scheduleId: schedule.id,
        unionId: schedule.unionId,
        localId: schedule.localId,
        periodKey: period.periodKey,
        userId: recipient.userId,
        to: recipient.email,
        subject: copy.subject,
        text: copy.text,
        html: copy.html,
      });
    }
  }

  return {
    schedules: schedules.length,
    skippedNoPeriod,
    skippedModuleOff,
    jobs,
  };
}

export function buildCheckinNudgeDryRunPayload(input: {
  schedules: number;
  skippedNoPeriod: number;
  skippedModuleOff: number;
  jobs: CheckinNudgeJob[];
}) {
  return {
    ok: true as const,
    dryRun: true as const,
    schedules: input.schedules,
    skippedNoPeriod: input.skippedNoPeriod,
    skippedModuleOff: input.skippedModuleOff,
    jobs: input.jobs.length,
    preview: input.jobs.map((j) => ({
      scheduleId: j.scheduleId,
      periodKey: j.periodKey,
      userId: j.userId,
      to: j.to,
      subject: j.subject,
    })),
  };
}

export async function sendCheckinNudgeJobs(
  jobs: CheckinNudgeJob[],
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const job of jobs) {
    const claimed = await claimCheckinNudgeSend({
      scheduleId: job.scheduleId,
      periodKey: job.periodKey,
      userId: job.userId,
      unionId: job.unionId,
      localId: job.localId,
      destinationEmail: job.to,
      env,
    });
    if (!claimed) {
      skipped += 1;
      continue;
    }

    const result = await sendTransactionalEmail({
      to: job.to,
      subject: job.subject,
      text: job.text,
      html: job.html,
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
