import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime, canClockTime } from "@/lib/time/access";
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
  const {
    category,
    jobCodeId,
    clockInAt,
    clockOutAt,
    notes,
    eventLabel,
    workerId: bodyWorkerId,
  } = body;

  if (!category || !jobCodeId || !clockInAt || !clockOutAt) {
    return NextResponse.json(
      {
        error: "category, jobCodeId, clockInAt, and clockOutAt are required",
      },
      { status: 400 },
    );
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const isAdmin = canAdminTime(roles);
  const targetWorkerId = bodyWorkerId ?? session.user.id;
  const isSelf = targetWorkerId === session.user.id;

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const codes = await timeStore.listJobCodes(unionId, localId);
  const jobCode = codes.find((c) => c.id === jobCodeId);
  if (!jobCode) {
    return NextResponse.json({ error: "Job code not found" }, { status: 404 });
  }

  let workerName = session.user.name ?? session.user.email ?? "Worker";
  let resolvedWorkerId = session.user.id;

  if (!isSelf) {
    const roster = await timeStore.listWorkers(unionId, localId);
    const worker = roster.find(
      (w) => w.id === targetWorkerId || w.userId === targetWorkerId,
    );
    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }
    workerName = worker.displayName;
    resolvedWorkerId = worker.userId ?? worker.id;
  }

  try {
    const entry = await timeStore.createManualEntry(
      {
        category,
        jobCodeId,
        clockInAt,
        clockOutAt,
        notes,
        eventLabel,
        workerId: resolvedWorkerId,
        workerName,
        status: isSelf ? "completed" : "submitted",
        entrySource: "manual_range",
      },
      { unionId, localId, jobCodeLabel: jobCode.label },
    );

    await auditLog.log({
      userId: session.user.id,
      action: "time.manual_create",
      resourceType: "time_entry",
      resourceId: entry.id,
      unionId,
      localId,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Manual entry failed";
    const status = message.includes("Overlapping") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
