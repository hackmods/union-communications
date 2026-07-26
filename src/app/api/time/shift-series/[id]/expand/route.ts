import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import type { UserRole } from "@/types/tenant";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const body = await request.json();
  const { from, to } = body as { from?: string; to?: string };
  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to are required" },
      { status: 400 },
    );
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const shifts = await timeStore.expandShiftSeries(id, from, to, {
    unionId,
    localId,
    createdById: session.user.id,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "time.shift_series.expand",
    resourceType: "time_shift_series",
    resourceId: id,
    unionId,
    localId,
    metadata: { created: String(shifts.length) },
  });

  return NextResponse.json({ shifts, created: shifts.length });
}
