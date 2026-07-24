import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertOfficerRosterView,
  requireOfficerRosterSession,
} from "@/lib/auth/officers-session";
import { canManageOfficerRoster } from "@/lib/officers/access";
import { officerRosterStore } from "@/lib/officers/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateOfficerRosterSchema } from "@/lib/validation/officers";
import type { UserRole } from "@/types/tenant";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireOfficerRosterSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const officer = await officerRosterStore.getById(id);
  if (!officer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertOfficerRosterView(authResult.session, officer)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ officer });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireOfficerRosterSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const roles = (authResult.session.user.roles ?? []) as UserRole[];
  if (!canManageOfficerRoster(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await officerRosterStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertOfficerRosterView(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(updateOfficerRosterSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const updated = await officerRosterStore.update(id, parsed.data);
  await auditLog.log({
    userId: authResult.session.user.id,
    action: "officers.update",
    resourceType: "officer_roster",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ officer: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireOfficerRosterSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const roles = (authResult.session.user.roles ?? []) as UserRole[];
  if (!canManageOfficerRoster(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await officerRosterStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertOfficerRosterView(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await officerRosterStore.remove(id);
  await auditLog.log({
    userId: authResult.session.user.id,
    action: "officers.delete",
    resourceType: "officer_roster",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
