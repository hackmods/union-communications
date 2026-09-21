import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { auditLog } from "@/lib/audit/store";
import {
  isBumpingModuleEnabled,
  listFiltersForBumpingSession,
} from "@/lib/auth/bumping-session";
import { listFiltersForSession, requireGrievanceSession } from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
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
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }

  const roles = (session.user.roles ?? []) as UserRole[];
  let includeGrievance = canAccessGrievanceModule(roles);
  const grievanceAuth = includeGrievance ? await requireGrievanceSession() : null;
  if (includeGrievance && !grievanceAuth?.ok) includeGrievance = false;
  const includeBumping =
    canAccessBumpingModule(roles) && isBumpingModuleEnabled(session);

  if (!includeGrievance && !includeBumping) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const grievanceActor = grievanceAuth?.ok ? grievanceAuth.actor : undefined;
  const filters = includeGrievance && grievanceAuth?.ok
    ? listFiltersForSession(session, grievanceAuth.actor)
    : undefined;
  const aggregate = () => aggregateHubCalendarEvents({
    includeGrievance,
    includeBumping,
    grievanceFilters: filters,
    grievanceActor,
    bumpingFilters: includeBumping
      ? listFiltersForBumpingSession(session)
      : undefined,
  });
  const events = grievanceAuth?.ok
    ? await withRlsContext(rlsContextForActor(session, grievanceAuth.actor) ?? {}, aggregate)
    : await aggregate();

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
