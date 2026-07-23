import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import {
  isBumpingModuleEnabled,
  listFiltersForBumpingSession,
} from "@/lib/auth/bumping-session";
import { listFiltersForSession } from "@/lib/auth/grievance-session";
import {
  aggregateHubCalendarEvents,
} from "@/lib/calendar/hub-aggregate";
import { canAccessBumpingModule } from "@/lib/bumping/access";
import { canAccessGrievanceModule } from "@/lib/grievance/access";
import type { UserRole } from "@/types/tenant";

/**
 * GET /api/calendar — union/local-scoped aggregation of grievance meetings
 * and bumping committee sessions (read-only). MFA + role gate mirrors
 * grievance/bumping module access.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.mfaVerified) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }

  const roles = (session.user.roles ?? []) as UserRole[];
  const includeGrievance = canAccessGrievanceModule(roles);
  const includeBumping =
    canAccessBumpingModule(roles) && isBumpingModuleEnabled(session);

  if (!includeGrievance && !includeBumping) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events = await aggregateHubCalendarEvents({
    includeGrievance,
    includeBumping,
    grievanceFilters: includeGrievance
      ? listFiltersForSession(session)
      : undefined,
    bumpingFilters: includeBumping
      ? listFiltersForBumpingSession(session)
      : undefined,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "calendar.list",
    resourceType: "calendar",
    resourceId: "*",
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ events });
}
