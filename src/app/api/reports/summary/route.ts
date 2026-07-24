import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import {
  isBumpingModuleEnabled,
  listFiltersForBumpingSession,
} from "@/lib/auth/bumping-session";
import { listFiltersForSession } from "@/lib/auth/grievance-session";
import {
  isTimeModuleEnabled,
  listFiltersForTimeSession,
} from "@/lib/auth/time-session";
import { canAccessBumpingModule } from "@/lib/bumping/access";
import { bumpingStore } from "@/lib/bumping/store";
import { isElevatedGrievanceRole } from "@/lib/grievance/access";
import { grievanceStore } from "@/lib/grievance/store";
import {
  buildReportsSummary,
  defaultReportsRange,
} from "@/lib/reports/aggregate";
import { canAccessTimeModule } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import type { UserRole } from "@/types/tenant";

/**
 * GET /api/reports/summary — elevated-role rollup of grievances, bumping,
 * and union-business time hours (ORG-005). Read-only; no new entities.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.mfaVerified) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }

  const roles = (session.user.roles ?? []) as UserRole[];
  if (!isElevatedGrievanceRole(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const defaults = defaultReportsRange();
  const from = url.searchParams.get("from") ?? defaults.from;
  const to = url.searchParams.get("to") ?? defaults.to;

  const includeBumping =
    canAccessBumpingModule(roles) && isBumpingModuleEnabled(session);
  const includeTime =
    canAccessTimeModule(roles) && isTimeModuleEnabled(session);

  const [grievances, bumpingCases, timeEntries] = await Promise.all([
    grievanceStore.list(listFiltersForSession(session)),
    includeBumping
      ? bumpingStore.list(listFiltersForBumpingSession(session))
      : Promise.resolve([]),
    includeTime
      ? timeStore.listEntries({
          ...listFiltersForTimeSession(session),
          workerId: undefined,
          from,
          to,
        })
      : Promise.resolve([]),
  ]);

  const summary = buildReportsSummary({
    from,
    to,
    grievances,
    bumpingCases,
    timeEntries,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "reports.summary",
    resourceType: "reports",
    resourceId: "*",
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json(summary);
}
