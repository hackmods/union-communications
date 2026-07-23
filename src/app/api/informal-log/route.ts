import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForInformalLogSession,
  requireInformalLogSession,
  tenantIdsForInformalLogSession,
} from "@/lib/auth/informal-log-session";
import {
  canCreateInformalLog,
} from "@/lib/informal-log/access";
import { informalLogStore } from "@/lib/informal-log/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createInformalLogSchema } from "@/lib/validation/informal-log";
import type { UserRole } from "@/types/tenant";

export async function GET(request: Request) {
  const authResult = await requireInformalLogSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const url = new URL(request.url);
  const filters = listFiltersForInformalLogSession(session);
  const unconvertedOnly = url.searchParams.get("unconverted") === "1";

  const entries = await informalLogStore.list({
    ...filters,
    unconvertedOnly: unconvertedOnly || undefined,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "informal_log.list",
    resourceType: "informal_log_entry",
    resourceId: "*",
    unionId: filters.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const authResult = await requireInformalLogSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canCreateInformalLog(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(createInformalLogSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const tenant = tenantIdsForInformalLogSession(session);

  const entry = await informalLogStore.create(input, {
    unionId: tenant.unionId,
    localId: tenant.localId,
    bargainingUnitId: input.bargainingUnitId ?? tenant.bargainingUnitId,
    loggedById: session.user.id,
    loggedByName: session.user.name ?? session.user.email ?? "Officer",
  });

  await auditLog.log({
    userId: session.user.id,
    action: "informal_log.create",
    resourceType: "informal_log_entry",
    resourceId: entry.id,
    unionId: entry.unionId,
    localId: entry.localId,
  });

  return NextResponse.json({ entry }, { status: 201 });
}
