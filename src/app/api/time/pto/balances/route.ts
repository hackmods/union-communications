import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForTimeSession,
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import { parseJsonBody } from "@/lib/validation/parse";
import type { UserRole } from "@/types/tenant";

const upsertSchema = z.object({
  workerId: z.string().min(1).max(120),
  ptoType: z.enum(["vacation", "sick", "personal", "other"]),
  hours: z.number().finite().max(24 * 365),
  mode: z.enum(["set", "adjust"]),
});

export async function GET() {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const filters = listFiltersForTimeSession(session);
  const balances = await timeStore.listPtoBalances({
    unionId: filters.unionId,
    localId: filters.localId,
    workerId: filters.workerId,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "time.pto.balances.list",
    resourceType: "pto_balance",
    resourceId: "*",
    unionId: filters.unionId,
    localId: filters.localId,
  });

  return NextResponse.json({ balances });
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
  const parsed = parseJsonBody(upsertSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const balance = await timeStore.upsertPtoBalance(parsed.data, {
    unionId,
    localId,
    updatedById: session.user.id,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "time.pto.balances.upsert",
    resourceType: "pto_balance",
    resourceId: balance.id,
    unionId,
    localId,
  });

  return NextResponse.json({ balance }, { status: 201 });
}
