import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertCronSecret,
  parseCronDryRun,
} from "@/lib/meetings/officer-reminder-cron";
import {
  buildCheckinNudgeDryRunPayload,
  buildCheckinNudgeJobs,
  sendCheckinNudgeJobs,
} from "@/lib/checkins/nudge-cron";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * Opt-in cron: transactional email to Hub officers who have not answered
 * the current check-in period. One nudge per (schedule, period, user).
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` or `x-cron-secret: $CRON_SECRET`
 * Requires `CRON_SECRET` + `EMAIL_ENABLED=true` (+ SMTP) to actually send.
 *
 * GET|POST /api/cron/checkin-nudges?dryRun=1
 */
async function handle(request: Request) {
  try {
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
    const dryRun = parseCronDryRun(url.searchParams);
    const built = await buildCheckinNudgeJobs({ origin: url.origin });

    if (dryRun) {
      return NextResponse.json(buildCheckinNudgeDryRunPayload(built));
    }

    const result = await sendCheckinNudgeJobs(built.jobs);

    await auditLog.log({
      userId: "system-cron",
      action: "email.checkin_nudge_cron",
      resourceType: "checkin_schedule",
      resourceId: "*",
      metadata: {
        schedules: String(built.schedules),
        skippedNoPeriod: String(built.skippedNoPeriod),
        skippedModuleOff: String(built.skippedModuleOff),
        jobs: String(built.jobs.length),
        sent: String(result.sent),
        failed: String(result.failed),
        skipped: String(result.skipped),
      },
    });

    return NextResponse.json({
      ok: true,
      schedules: built.schedules,
      skippedNoPeriod: built.skippedNoPeriod,
      skippedModuleOff: built.skippedModuleOff,
      jobs: built.jobs.length,
      ...result,
    });
  } catch (error) {
    reportApiFailure(error, "/api/cron/checkin-nudges", { source: "cron" });
    return NextResponse.json(
      { error: "Check-in nudge cron failed" },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
