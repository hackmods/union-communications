import { NextResponse } from "next/server";
import { withRlsContext } from "@/lib/db/rls-context";
import { isPostgresConfigured } from "@/lib/db/client";
import {
  assertCronSecret,
  parseCronDryRun,
} from "@/lib/meetings/officer-reminder-cron";
import { evaluateObservabilityAlerts } from "@/lib/observability/evaluate-alerts";
import { reportApiFailure } from "@/lib/observability/report-server-error";

export const runtime = "nodejs";

/**
 * Evaluate observability alert rules (Postgres or file store).
 * Auth: Authorization Bearer / x-cron-secret = CRON_SECRET
 *
 * GET|POST /api/cron/observability-alerts?dryRun=1
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

    const run = () => evaluateObservabilityAlerts({ dryRun });
    const summary = isPostgresConfigured()
      ? await withRlsContext({ retentionJob: true }, run)
      : await run();

    return NextResponse.json({
      ok: true,
      dryRun,
      ...summary,
    });
  } catch (error) {
    reportApiFailure(error, "/api/cron/observability-alerts", {
      source: "cron",
    });
    return NextResponse.json(
      { error: "Observability alerts cron failed" },
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
