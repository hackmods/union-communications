import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import { upsertOtPolicySchema } from "@/lib/validation/time";
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
  const policies = await timeStore.listOtPolicies(unionId, localId);

  await auditLog.log({
    userId: session.user.id,
    action: "time.ot_policies.list",
    resourceType: "time_ot_policy",
    resourceId: "*",
    unionId,
    localId,
  });

  return NextResponse.json({ policies });
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
  const parsed = upsertOtPolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid OT policy" }, { status: 400 });
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const policy = await timeStore.upsertOtPolicy(parsed.data, {
    unionId,
    localId,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "time.ot_policies.upsert",
    resourceType: "time_ot_policy",
    resourceId: policy.id,
    unionId,
    localId,
  });

  return NextResponse.json({ policy }, { status: 201 });
}
