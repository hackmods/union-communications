import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertInformalLogView,
  requireInformalLogSession,
} from "@/lib/auth/informal-log-session";
import {
  canCreateInformalLog,
  canDeleteInformalLog,
} from "@/lib/informal-log/access";
import { informalLogStore } from "@/lib/informal-log/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateInformalLogSchema } from "@/lib/validation/informal-log";
import type { UserRole } from "@/types/tenant";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInformalLogSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const entry = await informalLogStore.getById(id);
  if (!entry || !assertInformalLogView(authResult.session, entry)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "informal_log.view",
    resourceType: "informal_log_entry",
    resourceId: entry.id,
    unionId: entry.unionId,
    localId: entry.localId,
  });

  return NextResponse.json({ entry });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const existing = await informalLogStore.getById(id);
  if (!existing || !assertInformalLogView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.convertedToGrievanceId) {
    return NextResponse.json(
      { error: "Already converted to a grievance" },
      { status: 409 },
    );
  }

  const raw = await request.json();
  const parsed = parseJsonBody(updateInformalLogSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const entry = await informalLogStore.update(id, parsed.data);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "informal_log.update",
    resourceType: "informal_log_entry",
    resourceId: entry.id,
    unionId: entry.unionId,
    localId: entry.localId,
  });

  return NextResponse.json({ entry });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInformalLogSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  const { id } = await context.params;
  const existing = await informalLogStore.getById(id);
  if (!existing || !assertInformalLogView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canDeleteInformalLog(existing, session.user.id, roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await informalLogStore.remove(id);

  await auditLog.log({
    userId: session.user.id,
    action: "informal_log.delete",
    resourceType: "informal_log_entry",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
