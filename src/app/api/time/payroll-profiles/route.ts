import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import { upsertPayrollProfileSchema } from "@/lib/validation/time";
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
  const profiles = await timeStore.listPayrollProfiles(unionId, localId);

  return NextResponse.json({ profiles });
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
  const parsed = upsertPayrollProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payroll profile" },
      { status: 400 },
    );
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const profile = await timeStore.upsertPayrollProfile(parsed.data, {
    unionId,
    localId,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "time.payroll_profiles.upsert",
    resourceType: "payroll_export_profile",
    resourceId: profile.id,
    unionId,
    localId,
  });

  return NextResponse.json({ profile }, { status: 201 });
}
