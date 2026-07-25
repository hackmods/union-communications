import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import {
  assertPtoView,
  listFiltersForTimeSession,
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime, canClockTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import { parseJsonBody } from "@/lib/validation/parse";
import type { PtoType } from "@/types/time";
import type { UserRole } from "@/types/tenant";

const PTO_TYPES: PtoType[] = ["vacation", "sick", "personal", "other"];

const createSchema = z.object({
  workerId: z.string().min(1).max(120).optional(),
  workerName: z.string().min(1).max(200).optional(),
  ptoType: z.enum(["vacation", "sick", "personal", "other"]),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  hoursRequested: z.number().positive().max(24 * 60).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["draft", "submitted"]).optional(),
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
  const rows = await timeStore.listPtoRequests({
    unionId: filters.unionId,
    localId: filters.localId,
    workerId: filters.workerId,
    status: status as
      | "draft"
      | "submitted"
      | "approved"
      | "rejected"
      | "cancelled"
      | undefined,
  });
  const visible = rows.filter((r) => assertPtoView(session, r));

  await auditLog.log({
    userId: session.user.id,
    action: "time.pto.list",
    resourceType: "pto_request",
    resourceId: "*",
    unionId: filters.unionId,
    localId: filters.localId,
  });

  return NextResponse.json({ requests: visible });
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
  if (!canClockTime(roles)) {
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
  if (!PTO_TYPES.includes(parsed.data.ptoType)) {
    return NextResponse.json({ error: "Invalid ptoType" }, { status: 400 });
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const isAdmin = canAdminTime(roles);

  let workerId = parsed.data.workerId ?? session.user.id;
  let workerName =
    parsed.data.workerName ??
    session.user.name ??
    session.user.email ??
    "Worker";

  if (!isAdmin) {
    workerId = session.user.id;
    workerName = session.user.name ?? session.user.email ?? "Worker";
  } else if (parsed.data.workerId) {
    const roster = await timeStore.listWorkers(unionId, localId);
    const match = roster.find((w) => w.id === parsed.data.workerId);
    if (match) {
      workerId = match.id;
      workerName = match.displayName;
    }
  }

  try {
    const row = await timeStore.createPtoRequest(
      {
        workerId,
        workerName,
        ptoType: parsed.data.ptoType,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        hoursRequested: parsed.data.hoursRequested,
        notes: parsed.data.notes,
        status: parsed.data.status ?? "submitted",
      },
      { unionId, localId, requestedById: session.user.id },
    );

    await auditLog.log({
      userId: session.user.id,
      action: "time.pto.create",
      resourceType: "pto_request",
      resourceId: row.id,
      unionId,
      localId,
    });

    return NextResponse.json({ request: row }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
