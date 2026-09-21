import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
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

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const { session, actor } = authResult;
  const { id } = await params;
  const rls = rlsContextForActor(session, actor) ?? {};
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await authorizeGrievance(actor, data.grievance);
  const canPublish = access.allowed && access.level === "case_write" && decideCapability(actor, "grievances.member_updates.publish", { unionId: data.grievance.unionId, localId: data.grievance.localId }).allowed;
  if (!canPublish) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Member updates require durable database storage" }, { status: 503 });
  const body = await request.json().catch(() => null) as { body?: string } | null;
  const text = body?.body?.trim();
  if (!text || text.length > 4000) return NextResponse.json({ error: "Write a member update of 1 to 4,000 characters" }, { status: 400 });
  const [update] = await withRlsContext(rls, () => getDb().insert(grievanceMemberUpdates).values({
    id: randomUUID(), grievanceId: id, body: text, publishedById: session.user.id,
  }).returning());
  await auditLog.log({ userId: session.user.id, action: "grievance.member_update.publish", resourceType: "grievance_member_update", resourceId: update.id, unionId: data.grievance.unionId, localId: data.grievance.localId });
  return NextResponse.json({ update }, { status: 201 });
}

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const { session, actor } = authResult;
  const { id } = await params;
  const rls = rlsContextForActor(session, actor) ?? {};
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await authorizeGrievance(actor, data.grievance);
  if (!access.allowed || !["case_read", "case_write"].includes(access.level)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isPostgresConfigured()) return NextResponse.json({ updates: [], persistenceAvailable: false });
  const updates = await withRlsContext(rls, () => getDb().select().from(grievanceMemberUpdates).where(and(
    eq(grievanceMemberUpdates.grievanceId, id), isNull(grievanceMemberUpdates.withdrawnAt),
  )));
  return NextResponse.json({ updates });
}
