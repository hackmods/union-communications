import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForOfficerRosterSession,
  requireOfficerRosterSession,
  tenantIdsForOfficerRosterSession,
} from "@/lib/auth/officers-session";
import { canManageOfficerRoster } from "@/lib/officers/access";
import { filterExpiringSoon } from "@/lib/officers/term";
import { officerRosterStore } from "@/lib/officers/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createOfficerRosterSchema } from "@/lib/validation/officers";
import type { UserRole } from "@/types/tenant";

export async function GET() {
  const authResult = await requireOfficerRosterSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const filters = listFiltersForOfficerRosterSession(session);
  const officers = await officerRosterStore.list(filters);
  const expiringSoon = filterExpiringSoon(officers);

  await auditLog.log({
    userId: session.user.id,
    action: "officers.list",
    resourceType: "officer_roster",
    resourceId: "*",
    unionId: filters.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ officers, expiringSoon });
}

export async function POST(request: Request) {
  const authResult = await requireOfficerRosterSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canManageOfficerRoster(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.user.localId) {
    return NextResponse.json({ error: "Local required" }, { status: 400 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(createOfficerRosterSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const tenant = tenantIdsForOfficerRosterSession(session);
  const officer = await officerRosterStore.create(parsed.data, {
    unionId: tenant.unionId,
    localId: tenant.localId,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "officers.create",
    resourceType: "officer_roster",
    resourceId: officer.id,
    unionId: officer.unionId,
    localId: officer.localId,
  });

  return NextResponse.json({ officer }, { status: 201 });
}
