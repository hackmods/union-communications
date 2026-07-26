import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForTimeSession,
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { runAccrualPolicies } from "@/lib/time/accrual-formulas";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import { upsertAccrualPolicySchema } from "@/lib/validation/time";
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
  const policies = await timeStore.listAccrualPolicies(unionId, localId);

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
  const parsed = upsertAccrualPolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid accrual policy" },
      { status: 400 },
    );
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const policy = await timeStore.upsertAccrualPolicy(parsed.data, {
    unionId,
    localId,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "time.accrual_policies.upsert",
    resourceType: "pto_accrual_policy",
    resourceId: policy.id,
    unionId,
    localId,
  });

  return NextResponse.json({ policy }, { status: 201 });
}

export async function PATCH(request: Request) {
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
  const { from, to } = body as { from?: string; to?: string };
  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to are required" },
      { status: 400 },
    );
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const policies = await timeStore.listAccrualPolicies(unionId, localId);
  const workers = await timeStore.listWorkers({ unionId, localId });
  const entries = await timeStore.listEntries({
    ...listFiltersForTimeSession(session),
    from,
    to,
  });
  const balances = await timeStore.listPtoBalances({ unionId, localId });
  const balanceMap = new Map(
    balances.map((b) => [`${b.workerId}::${b.ptoType}`, b.hoursBalance]),
  );

  const results = runAccrualPolicies({
    policies,
    workers,
    entries,
    from,
    to,
    currentBalances: balanceMap,
  });

  for (const result of results) {
    await timeStore.upsertPtoBalance(
      {
        workerId: result.workerId,
        ptoType: result.ptoType,
        hours: result.hoursAccrued,
        mode: "adjust",
      },
      { unionId, localId, updatedById: session.user.id },
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "time.accrual_policies.run",
    resourceType: "pto_accrual_policy",
    resourceId: "*",
    unionId,
    localId,
    metadata: { adjustments: String(results.length) },
  });

  return NextResponse.json({ results });
}
