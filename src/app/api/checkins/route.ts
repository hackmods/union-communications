import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertCanManageCheckins,
  assertCheckinScheduleView,
  listFiltersForCheckinsSession,
  requireCheckinsSession,
  tenantIdsForCheckinsSession,
} from "@/lib/auth/checkins-session";
import { checkinsStore } from "@/lib/checkins/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createCheckinScheduleSchema } from "@/lib/validation/checkins";

export async function GET() {
  const authResult = await requireCheckinsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const filters = listFiltersForCheckinsSession(session);
  const items = await checkinsStore.listSchedules(filters);

  const schedules = items.filter((s) =>
    assertCheckinScheduleView(session, s),
  );

  await auditLog.log({
    userId: session.user.id,
    action: "checkins.list",
    resourceType: "checkin_schedule",
    resourceId: "*",
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ schedules });
}

export async function POST(request: Request) {
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(createCheckinScheduleSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const { unionId, localId } = tenantIdsForCheckinsSession(session);
  const schedule = await checkinsStore.createSchedule(parsed.data, {
    unionId,
    localId,
    createdById: session.user.id,
    createdByName: session.user.name ?? session.user.email ?? "Officer",
  });

  await auditLog.log({
    userId: session.user.id,
    action: "checkins.create",
    resourceType: "checkin_schedule",
    resourceId: schedule.id,
    unionId,
    localId,
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
