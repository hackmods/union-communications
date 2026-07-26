import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import { createShiftSeriesSchema } from "@/lib/validation/time";
import type { UserRole } from "@/types/tenant";

export async function GET() {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAdminTime(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const series = await timeStore.listShiftSeries(unionId, localId);

  await auditLog.log({
    userId: session.user.id,
    action: "time.shift_series.list",
    resourceType: "time_shift_series",
    resourceId: "*",
    unionId,
    localId,
  });

  return NextResponse.json({ series });
}

export async function POST(request: Request) {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAdminTime(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createShiftSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid shift series" }, { status: 400 });
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const row = await timeStore.createShiftSeries(parsed.data, {
    unionId,
    localId,
    createdById: session.user.id,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "time.shift_series.create",
    resourceType: "time_shift_series",
    resourceId: row.id,
    unionId,
    localId,
  });

  return NextResponse.json({ series: row }, { status: 201 });
}
