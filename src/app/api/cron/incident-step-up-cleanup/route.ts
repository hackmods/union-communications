import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { assertCronSecret, parseCronDryRun } from "@/lib/meetings/officer-reminder-cron";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";

/**
 * Purge expired platform incident step-up grants via SECURITY DEFINER helpers.
 * Runtime DELETE on those rows is revoked from unionops_app (migration 0070).
 */
async function handle(request: Request, dryOnly = false) {
  const secret = process.env.CRON_SECRET;
  if (
    !assertCronSecret(request.headers.get("authorization"), secret) &&
    !assertCronSecret(request.headers.get("x-cron-secret"), secret)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Incident grant cleanup requires Postgres" },
      { status: 503 },
    );
  }
  const dryRun = dryOnly || parseCronDryRun(new URL(request.url).searchParams);
  try {
    const result = await withRlsContext({ retentionJob: true }, async () => {
      const db = getDb();
      const counted = await db.execute(
        sql`SELECT app_count_expired_incident_step_up_grants() AS eligible_count`,
      );
      const eligibleCount = Number(counted[0]?.eligible_count ?? 0);
      if (dryRun) {
        return { eligibleCount, purgedCount: 0 };
      }
      const purged = await db.execute(
        sql`SELECT app_purge_expired_incident_step_up_grants() AS purged_count`,
      );
      return {
        eligibleCount,
        purgedCount: Number(purged[0]?.purged_count ?? 0),
      };
    });
    return NextResponse.json(
      { ok: true, dryRun, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Incident grant cleanup failed",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: Request) {
  return handle(request, true);
}

export async function POST(request: Request) {
  return handle(request);
}
