import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertCanManageCheckins,
  assertCheckinScheduleView,
  requireCheckinsSession,
} from "@/lib/auth/checkins-session";
import { currentPeriodForSchedule } from "@/lib/checkins/periods";
import { checkinsStore } from "@/lib/checkins/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateCheckinScheduleSchema } from "@/lib/validation/checkins";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCheckinsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const schedule = await checkinsStore.getSchedule(id);
  if (!schedule || !assertCheckinScheduleView(authResult.session, schedule)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const period = currentPeriodForSchedule(schedule);

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "checkins.get",
    resourceType: "checkin_schedule",
    resourceId: schedule.id,
    unionId: schedule.unionId,
    localId: schedule.localId,
  });

  return NextResponse.json({ schedule, period });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCheckinsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  if (!assertCanManageCheckins(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await checkinsStore.getSchedule(id);
  if (!existing || !assertCheckinScheduleView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(updateCheckinScheduleSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const cadence = parsed.data.cadence ?? existing.cadence;
  if (cadence === "weekly") {
    const weekday =
      parsed.data.weekday !== undefined
        ? parsed.data.weekday
        : (existing.weekday ?? null);
    if (weekday === null || weekday === undefined) {
      return NextResponse.json(
        { error: "weekday is required when cadence is weekly" },
        { status: 400 },
      );
    }
  }

  const schedule = await checkinsStore.updateSchedule(id, parsed.data);
  if (!schedule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "checkins.update",
    resourceType: "checkin_schedule",
    resourceId: schedule.id,
    unionId: schedule.unionId,
    localId: schedule.localId,
  });

  return NextResponse.json({ schedule });
}
