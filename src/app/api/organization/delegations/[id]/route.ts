import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability, isCrossLocalAdministrator } from "@/lib/authorization/model";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { authorityDelegations, locals } from "@/lib/db/schema";
import { auditLog } from "@/lib/audit/store";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Delegation management requires Postgres" }, { status: 503 });
  const session = await auth();
  if (!session?.user?.unionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { localId?: string };
  const localId = body.localId ?? session.user.localId;
  if (!localId || !decideCapability(actor, "delegations.manage", { unionId: actor.unionId, localId }).allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rls = { unionId: session.user.unionId, localId, userId: session.user.id, crossLocal: isCrossLocalAdministrator(actor) };
  const [local] = await withRlsContext(rls, () => getDb().select({ id: locals.id }).from(locals).where(and(eq(locals.id, localId), eq(locals.unionId, session.user.unionId!))).limit(1));
  if (!local) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await params;
  const [delegation] = await withRlsContext(rls, () => getDb().select().from(authorityDelegations).where(and(
    eq(authorityDelegations.id, id), eq(authorityDelegations.unionId, session.user.unionId!), eq(authorityDelegations.localId, local.id),
  )).limit(1));
  if (!delegation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (delegation.revokedAt) return NextResponse.json({ delegation });
  const updated = await withRlsContext(rls, () => getDb().transaction(async (tx) => {
    const [row] = await tx.update(authorityDelegations).set({ revokedAt: new Date(), revokedById: session.user.id })
      .where(eq(authorityDelegations.id, delegation.id)).returning();
    await tx.execute(sql`UPDATE users SET session_version = session_version + 1 WHERE id = ${delegation.delegateUserId}`);
    return row;
  }));
  await auditLog.log({ userId: session.user.id, action: "delegation.revoke", resourceType: "authority_delegation", resourceId: delegation.id, unionId: delegation.unionId, localId: delegation.localId });
  return NextResponse.json({ delegation: updated });
}
