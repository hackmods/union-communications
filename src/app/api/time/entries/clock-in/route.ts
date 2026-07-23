import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canClockTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import type { TimeCategory } from "@/types/time";
import type { UserRole } from "@/types/tenant";

const VALID_CATEGORIES: TimeCategory[] = [
  "staff",
  "release",
  "duty_bank",
  "action",
  "volunteer",
];

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
  if (!canClockTime(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { category, jobCodeId, notes, clockInGps } = body;

  if (!category || !jobCodeId) {
    return NextResponse.json(
      { error: "category and jobCodeId are required" },
      { status: 400 },
    );
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const codes = await timeStore.listJobCodes(unionId, localId);
  const jobCode = codes.find((c) => c.id === jobCodeId);
  if (!jobCode) {
    return NextResponse.json({ error: "Job code not found" }, { status: 404 });
  }

  if (clockInGps) {
    const sites = await timeStore.listSites(unionId, localId);
    const { checkGeofence } = await import("@/lib/time/geofence");
    const result = checkGeofence(clockInGps, sites);
    if (result === "block") {
      return NextResponse.json(
        { error: "Clock-in blocked: outside authorized location" },
        { status: 403 },
      );
    }
  }

  try {
    const entry = await timeStore.clockIn(
      { category, jobCodeId, notes, clockInGps },
      {
        unionId,
        localId,
        workerId: session.user.id,
        workerName: session.user.name ?? session.user.email ?? "Worker",
        jobCodeLabel: jobCode.label,
      },
    );

    await auditLog.log({
      userId: session.user.id,
      action: "time.clock_in",
      resourceType: "time_entry",
      resourceId: entry.id,
      unionId,
      localId,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clock-in failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
