import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import { upsertWorkerGroupSchema } from "@/lib/validation/time";
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
  const groups = await timeStore.listWorkerGroups(unionId, localId);

  await auditLog.log({
    userId: session.user.id,
    action: "time.groups.list",
    resourceType: "time_worker_group",
    resourceId: "*",
    unionId,
    localId,
  });

  return NextResponse.json({ groups });
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
  const parsed = upsertWorkerGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid group" }, { status: 400 });
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const group = await timeStore.upsertWorkerGroup(parsed.data, {
    unionId,
    localId,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "time.groups.upsert",
    resourceType: "time_worker_group",
    resourceId: group.id,
    unionId,
    localId,
  });

  return NextResponse.json({ group }, { status: 201 });
}
