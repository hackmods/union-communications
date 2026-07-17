import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/memory-adapter";
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
  if (!canAdminTime(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    category,
    jobCodeId,
    clockInAt,
    clockOutAt,
    eventLabel,
    notes,
    workerIds,
  } = body;

  if (
    !category ||
    !jobCodeId ||
    !clockInAt ||
    !clockOutAt ||
    !eventLabel ||
    !Array.isArray(workerIds) ||
    workerIds.length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "category, jobCodeId, clockInAt, clockOutAt, eventLabel, and workerIds are required",
      },
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

  const roster = await timeStore.listWorkers(unionId, localId);
  const workers: Array<{ workerId: string; workerName: string }> = [];
  for (const id of workerIds as string[]) {
    const worker = roster.find((w) => w.id === id || w.userId === id);
    if (!worker) {
      return NextResponse.json(
        { error: `Worker not found: ${id}` },
        { status: 404 },
      );
    }
    workers.push({
      workerId: worker.userId ?? worker.id,
      workerName: worker.displayName,
    });
  }

  try {
    const entries = await timeStore.createBulkEventEntries(
      {
        category,
        jobCodeId,
        clockInAt,
        clockOutAt,
        eventLabel,
        notes,
        workers,
      },
      { unionId, localId, jobCodeLabel: jobCode.label },
    );

    await auditLog.log({
      userId: session.user.id,
      action: "time.bulk_event",
      resourceType: "time_entry",
      resourceId: entries[0]?.eventId ?? "*",
      unionId,
      localId,
    });

    return NextResponse.json({ entries }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk event failed";
    const status = message.includes("Overlapping") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
