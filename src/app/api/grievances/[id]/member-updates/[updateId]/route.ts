import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { decideCapability } from "@/lib/authorization/model";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { grievanceMemberUpdates } from "@/lib/db/schema";
import { grievanceStore } from "@/lib/grievance/store";
import { authorizeGrievance } from "@/lib/grievance/authorization";

type Params = { params: Promise<{ id: string; updateId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const { session, actor } = authResult;
  const { id, updateId } = await params;
  const rls = rlsContextForActor(session, actor) ?? {};
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await authorizeGrievance(actor, data.grievance);
  const canPublish = access.allowed && access.level === "case_write" && decideCapability(actor, "grievances.member_updates.publish", { unionId: data.grievance.unionId, localId: data.grievance.localId }).allowed;
  if (!canPublish) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Member updates require durable database storage" }, { status: 503 });
  const [update] = await withRlsContext(rls, () => getDb().update(grievanceMemberUpdates)
    .set({ withdrawnAt: new Date() }).where(and(
      eq(grievanceMemberUpdates.id, updateId), eq(grievanceMemberUpdates.grievanceId, id), isNull(grievanceMemberUpdates.withdrawnAt),
    )).returning({ id: grievanceMemberUpdates.id }));
  if (!update) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await auditLog.log({ userId: session.user.id, action: "grievance.member_update.withdraw", resourceType: "grievance_member_update", resourceId: update.id, unionId: data.grievance.unionId, localId: data.grievance.localId });
  return NextResponse.json({ ok: true });
}
