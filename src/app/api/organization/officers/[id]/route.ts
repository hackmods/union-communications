import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability, isCrossLocalAdministrator } from "@/lib/authorization/model";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { locals, officerAssignments } from "@/lib/db/schema";
import { auditLog } from "@/lib/audit/store";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Officer management requires Postgres" }, { status: 503 });
  const session = await auth();
  if (!session?.user?.unionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { localId?: string };
  const localId = body.localId ?? session.user.localId;
  if (!localId || !decideCapability(actor, "officers.manage", { unionId: actor.unionId, localId }).allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const rls = { unionId: session.user.unionId, localId, userId: session.user.id, crossLocal: isCrossLocalAdministrator(actor) };
  const [assignment] = await withRlsContext(rls, () => getDb().select().from(officerAssignments).where(and(
    eq(officerAssignments.id, id), eq(officerAssignments.unionId, session.user.unionId!), eq(officerAssignments.localId, localId),
  )).limit(1));
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [local] = await withRlsContext(rls, () => getDb().select({ id: locals.id }).from(locals).where(and(eq(locals.id, localId), eq(locals.unionId, session.user.unionId!))).limit(1));
  if (!local) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assignment.revokedAt) return NextResponse.json({ assignment });
  const updated = await withRlsContext(rls, () => getDb().transaction(async (tx) => {
    const [row] = await tx.update(officerAssignments).set({ revokedAt: new Date() }).where(eq(officerAssignments.id, assignment.id)).returning();
    await tx.execute(sql`UPDATE users SET session_version = session_version + 1 WHERE id = ${assignment.userId}`);
    await tx.execute(sql`SELECT app_sync_local_portal_membership(${assignment.unionId}, ${assignment.localId}, ${assignment.userId})`);
    return row;
  }));
  await auditLog.log({ userId: session.user.id, action: "officer.assignment.revoke", resourceType: "officer_assignment", resourceId: assignment.id, unionId: assignment.unionId, localId: assignment.localId });
  return NextResponse.json({ assignment: updated });
}
