import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertCheckinScheduleView,
  listFiltersForCheckinsSession,
  requireCheckinsSession,
} from "@/lib/auth/checkins-session";
import { currentPeriodForSchedule } from "@/lib/checkins/periods";
import { checkinsStore } from "@/lib/checkins/store";
import type { CheckinPendingItem } from "@/types/checkins";

/** Unanswered check-ins for the signed-in officer in the current period. */
export async function GET(request: Request) {
  const authResult = await requireCheckinsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const url = new URL(request.url);
  const unansweredOnly = url.searchParams.get("unanswered") === "1";

  const filters = {
    ...listFiltersForCheckinsSession(session),
    activeOnly: true as const,
  };
  const schedules = (await checkinsStore.listSchedules(filters)).filter((s) =>
    assertCheckinScheduleView(session, s),
  );

  const pending: CheckinPendingItem[] = [];
  for (const schedule of schedules) {
    const period = currentPeriodForSchedule(schedule);
    if (!period) continue;
    if (unansweredOnly) {
      const existing = await checkinsStore.getAnswer(
        schedule.id,
        period.periodKey,
        session.user.id,
      );
      if (existing) continue;
    }
    pending.push({
      schedule,
      periodKey: period.periodKey,
      periodLabel: period.periodLabel,
    });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "checkins.mine",
    resourceType: "checkin_schedule",
    resourceId: "*",
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ pending });
}
