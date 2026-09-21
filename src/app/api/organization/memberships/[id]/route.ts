import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability, isCrossLocalAdministrator } from "@/lib/authorization/model";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { localMemberships, locals, users } from "@/lib/db/schema";
import { auditLog } from "@/lib/audit/store";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Membership management requires Postgres" }, { status: 503 });
  const session = await auth();
  if (!session?.user?.unionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { status?: "active" | "inactive"; isPrimary?: boolean; localId?: string } | null;
  if (!body || (body.status !== undefined && !["active", "inactive"].includes(body.status))) {
    return NextResponse.json({ error: "Invalid membership update" }, { status: 400 });
  }

  const targetLocalId = body.localId ?? session.user.localId;
  if (!targetLocalId) return NextResponse.json({ error: "Local context required" }, { status: 400 });
  const rls = { unionId: session.user.unionId, localId: targetLocalId, userId: session.user.id, crossLocal: isCrossLocalAdministrator(actor) };
  const [existing] = await withRlsContext(rls, () => getDb().select().from(localMemberships).where(and(
    eq(localMemberships.id, id), eq(localMemberships.unionId, session.user.unionId!), eq(localMemberships.localId, targetLocalId),
  )).limit(1));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!decideCapability(actor, "memberships.manage", { unionId: existing.unionId, localId: existing.localId }).allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const [local] = await withRlsContext(rls, () => getDb().select({ id: locals.id }).from(locals)
    .where(and(eq(locals.id, existing.localId), eq(locals.unionId, existing.unionId))).limit(1));
  if (!local) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status === "inactive" && existing.userId === session.user.id) {
    return NextResponse.json({ error: "Transfer membership authority before ending your own local membership" }, { status: 400 });
  }

  if (body.isPrimary && (existing.status !== "active" || body.status === "inactive")) {
    return NextResponse.json({ error: "Only an active membership can be primary" }, { status: 400 });
  }
  if (body.isPrimary === false && existing.isPrimary && body.status !== "inactive") {
    return NextResponse.json({ error: "Choose another primary local before clearing this one" }, { status: 400 });
  }
  const updated = await withRlsContext(rls, () => getDb().transaction(async (tx) => {
    const now = new Date();
    if (body.status === "active") {
      const [target] = await tx.select({ lockedAt: users.lockedAt, archivedAt: users.archivedAt }).from(users).where(eq(users.id, existing.userId)).limit(1);
      if (!target || target.lockedAt || target.archivedAt) return { error: "Membership cannot be activated for an inactive account" };
    }
    if (body.isPrimary === true) {
      await tx.update(localMemberships).set({ isPrimary: false }).where(and(
        eq(localMemberships.unionId, existing.unionId), eq(localMemberships.userId, existing.userId),
      ));
      await tx.update(users).set({ localId: existing.localId, bargainingUnitId: existing.bargainingUnitId ?? null })
        .where(eq(users.id, existing.userId));
    }
    const [row] = await tx.update(localMemberships).set({
      ...(body.status === "inactive" ? { status: "inactive" as const, endedAt: now, isPrimary: false } : {}),
      ...(body.status === "active" ? { status: "active" as const, startedAt: now, endedAt: null } : {}),
      ...(body.isPrimary !== undefined ? { isPrimary: body.isPrimary } : {}),
    }).where(eq(localMemberships.id, existing.id)).returning();
    if (body.status === "inactive" && existing.status === "active") {
      await tx.execute(sql`SELECT app_revoke_local_portal_membership(${existing.unionId}, ${existing.localId}, ${existing.userId})`);
    }
    if (body.status === "active") {
      await tx.execute(sql`SELECT app_sync_local_portal_membership(${existing.unionId}, ${existing.localId}, ${existing.userId})`);
      await tx.execute(sql`UPDATE users SET accessible_local_ids = (SELECT jsonb_agg(DISTINCT entry.local_id) FROM (SELECT jsonb_array_elements_text(coalesce(accessible_local_ids, '[]'::jsonb)) AS local_id UNION ALL SELECT ${existing.localId}) AS entry) WHERE id = ${existing.userId}`);
    }
    if ((body.status !== "inactive" || existing.status !== "active") && (body.status !== undefined || body.isPrimary !== undefined)) {
      await tx.execute(sql`UPDATE users SET session_version = session_version + 1 WHERE id = ${existing.userId}`);
    }
    return { row };
  }));
  if ("error" in updated) return NextResponse.json({ error: updated.error }, { status: 400 });
  await auditLog.log({
    userId: session.user.id,
    action: body.status === "inactive" ? "membership.revoke" : body.isPrimary ? "membership.set_primary" : "membership.update",
    resourceType: "local_membership",
    resourceId: updated.row.id,
    unionId: existing.unionId,
    localId: existing.localId,
  });
  return NextResponse.json({ membership: updated.row });
}
