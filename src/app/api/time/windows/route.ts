import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
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
  const { unionId, localId } = tenantIdsForTimeSession(session);
  const windows = await timeStore.listExpectedWindows(unionId, localId);
  const isAdmin = canAdminTime(roles);

  let visible = windows;
  if (!isAdmin) {
    const roster = await timeStore.listWorkers(unionId, localId);
    const mine = roster.find(
      (w) => w.userId === session.user.id || w.id === session.user.id,
    );
    visible = windows.filter(
      (w) =>
        !!mine &&
        (w.attendeeWorkerIds.includes(mine.id) ||
          (!!mine.userId && w.attendeeWorkerIds.includes(mine.userId))),
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "time.windows.list",
    resourceType: "time_expected_window",
    resourceId: "*",
    unionId,
    localId,
  });

  return NextResponse.json({ windows: visible });
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
  const {
    label,
    startsAt,
    endsAt,
    category,
    jobCodeId,
    attendeeWorkerIds,
  } = body;

  if (
    !label ||
    !startsAt ||
    !endsAt ||
    !category ||
    !Array.isArray(attendeeWorkerIds)
  ) {
    return NextResponse.json(
      {
        error:
          "label, startsAt, endsAt, category, and attendeeWorkerIds are required",
      },
      { status: 400 },
    );
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);

  try {
    const window = await timeStore.createExpectedWindow(
      {
        label,
        startsAt,
        endsAt,
        category,
        jobCodeId,
        attendeeWorkerIds,
      },
      { unionId, localId, createdById: session.user.id },
    );

    await auditLog.log({
      userId: session.user.id,
      action: "time.windows.create",
      resourceType: "time_expected_window",
      resourceId: window.id,
      unionId,
      localId,
    });

    return NextResponse.json({ window }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Window create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
