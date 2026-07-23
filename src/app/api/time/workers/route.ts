import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
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
  const { unionId, localId } = tenantIdsForTimeSession(session);
  const workers = await timeStore.listWorkers(unionId, localId);

  await auditLog.log({
    userId: session.user.id,
    action: "time.workers.list",
    resourceType: "time_worker",
    resourceId: "*",
    unionId,
    localId,
  });

  return NextResponse.json({ workers });
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
  const { displayName, userId, trackGaps, active, id } = body;
  if (!displayName || typeof displayName !== "string") {
    return NextResponse.json(
      { error: "displayName is required" },
      { status: 400 },
    );
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const worker = await timeStore.upsertWorker(
    { displayName, userId, trackGaps, active, id },
    { unionId, localId },
  );

  await auditLog.log({
    userId: session.user.id,
    action: "time.workers.upsert",
    resourceType: "time_worker",
    resourceId: worker.id,
    unionId,
    localId,
  });

  return NextResponse.json({ worker }, { status: 201 });
}
