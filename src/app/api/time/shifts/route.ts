import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import {
  assertShiftView,
  listFiltersForTimeSession,
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import { parseJsonBody } from "@/lib/validation/parse";
import type { TimeCategory } from "@/types/time";
import type { UserRole } from "@/types/tenant";

const CATEGORIES: TimeCategory[] = [
  "staff",
  "release",
  "duty_bank",
  "action",
  "volunteer",
];

const createSchema = z.object({
  label: z.string().min(1).max(200),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  category: z.enum(["staff", "release", "duty_bank", "action", "volunteer"]),
  siteId: z.string().min(1).max(120).optional(),
  jobCodeId: z.string().min(1).max(120).optional(),
  assignedWorkerIds: z.array(z.string().min(1).max(120)).max(200).default([]),
  status: z.enum(["draft", "published"]).optional(),
});

export async function GET(request: Request) {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const filters = listFiltersForTimeSession(session);
  const rows = await timeStore.listShifts({
    unionId: filters.unionId,
    localId: filters.localId,
    workerId: filters.workerId,
    status: status as "draft" | "published" | "cancelled" | undefined,
  });
  const visible = rows.filter((s) => assertShiftView(session, s));

  await auditLog.log({
    userId: session.user.id,
    action: "time.shifts.list",
    resourceType: "time_shift",
    resourceId: "*",
    unionId: filters.unionId,
    localId: filters.localId,
  });

  return NextResponse.json({ shifts: visible });
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(createSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }
  if (!CATEGORIES.includes(parsed.data.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);

  try {
    const row = await timeStore.createShift(
      {
        label: parsed.data.label,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        category: parsed.data.category,
        siteId: parsed.data.siteId,
        jobCodeId: parsed.data.jobCodeId,
        assignedWorkerIds: parsed.data.assignedWorkerIds ?? [],
        status: parsed.data.status ?? "draft",
      },
      { unionId, localId, createdById: session.user.id },
    );

    await auditLog.log({
      userId: session.user.id,
      action: "time.shifts.create",
      resourceType: "time_shift",
      resourceId: row.id,
      unionId,
      localId,
    });

    return NextResponse.json({ shift: row }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
