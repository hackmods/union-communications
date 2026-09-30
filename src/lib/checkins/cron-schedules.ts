import { eq } from "drizzle-orm";
import { checkinsDbBackend } from "@/lib/db/backend";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { checkinSchedules } from "@/lib/db/schema";
import type { CheckinSchedule } from "@/types/checkins";
import { listMemoryActiveCheckinSchedules } from "@/lib/checkins/memory-adapter";

function mapScheduleRow(
  row: typeof checkinSchedules.$inferSelect,
): CheckinSchedule {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    bargainingUnitId: row.bargainingUnitId ?? undefined,
    question: row.question,
    cadence: row.cadence as CheckinSchedule["cadence"],
    weekday: row.weekday ?? undefined,
    active: row.active,
    createdById: row.createdById,
    createdByName: row.createdByName,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt),
  };
}

/** Active schedules across all tenants (cron worker). */
export async function listActiveCheckinSchedulesForCron(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<CheckinSchedule[]> {
  if (checkinsDbBackend(env) !== "postgres" || !isPostgresConfigured()) {
    return listMemoryActiveCheckinSchedules();
  }
  const rows = await withRlsContext({ retentionJob: true }, () =>
    getDb()
      .select()
      .from(checkinSchedules)
      .where(eq(checkinSchedules.active, true)),
  );
  return rows.map(mapScheduleRow);
}
