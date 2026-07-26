import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForTimeSession,
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { applyOtPolicy, resolveOtPolicy } from "@/lib/time/ot-policy";
import {
  buildPayrollExportRows,
  payrollRowsToCsv,
  postPayrollWebhook,
} from "@/lib/time/payroll-hooks";
import { timeStore } from "@/lib/time/store";
import { canAdminTime } from "@/lib/time/access";
import type { UserRole } from "@/types/tenant";

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
  const { profileId, from, to } = body as {
    profileId?: string;
    from?: string;
    to?: string;
  };
  if (!profileId || !from || !to) {
    return NextResponse.json(
      { error: "profileId, from, and to are required" },
      { status: 400 },
    );
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const profiles = await timeStore.listPayrollProfiles(unionId, localId);
  const profile = profiles.find((p) => p.id === profileId && p.active);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const entries = await timeStore.listEntries({
    ...listFiltersForTimeSession(session),
    from,
    to,
    status: "approved",
  });
  const workers = await timeStore.listWorkers({
    unionId,
    localId,
    includeInactive: true,
  });

  let otBreakdown;
  if (profile.includeOtBreakdown) {
    const policies = await timeStore.listOtPolicies(unionId, localId);
    const policy = resolveOtPolicy(policies);
    if (policy) {
      otBreakdown = applyOtPolicy(entries, policy);
    }
  }

  const rows = buildPayrollExportRows({
    profile,
    entries,
    workers,
    otBreakdown,
  });

  const webhook = await postPayrollWebhook(profile, { rows, from, to });

  await auditLog.log({
    userId: session.user.id,
    action: "time.payroll_export",
    resourceType: "payroll_export_profile",
    resourceId: profileId,
    unionId,
    localId,
    metadata: { rowCount: String(rows.length), webhookOk: String(webhook.ok) },
  });

  const csv = payrollRowsToCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-${profile.vendor}.csv"`,
      "X-Payroll-Webhook-Ok": webhook.ok ? "true" : "false",
    },
  });
}
