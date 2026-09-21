import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { decideCapability } from "@/lib/authorization/model";
import {
  assertOfficerRosterView,
  requireOfficerRosterSession,
} from "@/lib/auth/officers-session";
import { officerRosterStore } from "@/lib/officers/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateOfficerRosterSchema } from "@/lib/validation/officers";
import { withRlsContext } from "@/lib/db/rls-context";
import { isPostgresConfigured } from "@/lib/db/client";
import { getDb } from "@/lib/db/client";
import { officerAssignments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireOfficerRosterSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const { id } = await context.params;
  const officer = await withRlsContext(rls, () => officerRosterStore.getById(id));
  if (!officer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertOfficerRosterView(actor, officer)) {
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

  const { session, actor } = authResult;
  if (!decideCapability(actor, "officers.manage", { unionId: session.user.unionId, localId: session.user.localId }).allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const rls = rlsContextForActor(session, actor) ?? {};
  const existing = await withRlsContext(rls, () => officerRosterStore.getById(id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertOfficerRosterView(actor, existing)) {
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

  const updated = await withRlsContext(rls, () => officerRosterStore.update(id, parsed.data));
  await auditLog.log({
    userId: session.user.id,
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

  const { session, actor } = authResult;
  if (!decideCapability(actor, "officers.manage", { unionId: session.user.unionId, localId: session.user.localId }).allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const rls = rlsContextForActor(session, actor) ?? {};
  const existing = await withRlsContext(rls, () => officerRosterStore.getById(id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertOfficerRosterView(actor, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isPostgresConfigured()) {
    const [assignment] = await withRlsContext(rls, () => getDb().select({ id: officerAssignments.id }).from(officerAssignments)
      .where(eq(officerAssignments.officerRosterId, id)).limit(1));
    if (assignment) return NextResponse.json({ error: "Unlink or revoke the normalized office assignment before deleting this roster entry" }, { status: 409 });
  }

  await withRlsContext(rls, () => officerRosterStore.remove(id));
  await auditLog.log({
    userId: session.user.id,
    action: "officers.delete",
    resourceType: "officer_roster",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
