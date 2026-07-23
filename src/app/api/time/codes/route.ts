import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
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
  const codes = await timeStore.listJobCodes(unionId, localId);

  return NextResponse.json({ codes });
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
  const { code, label, category } = body;

  if (!code || !label || !category) {
    return NextResponse.json(
      { error: "code, label, and category are required" },
      { status: 400 },
    );
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const created = await timeStore.createJobCode(
    { code, label, category },
    { unionId, localId },
  );

  await auditLog.log({
    userId: session.user.id,
    action: "time.code.create",
    resourceType: "job_code",
    resourceId: created.id,
    unionId,
    localId,
  });

  return NextResponse.json({ code: created }, { status: 201 });
}
