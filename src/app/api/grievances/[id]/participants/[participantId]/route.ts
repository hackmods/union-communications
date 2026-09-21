import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { grievanceParticipants } from "@/lib/db/schema";
import { grievanceStore } from "@/lib/grievance/store";
import { authorizeGrievance } from "@/lib/grievance/authorization";
import { decideCapability } from "@/lib/authorization/model";

type Params = { params: Promise<{ id: string; participantId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const { session, actor } = authResult;
  const { id, participantId } = await params;
  const rls = rlsContextForActor(session, actor) ?? {};
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await authorizeGrievance(actor, data.grievance);
  if (!access.allowed || access.level !== "case_write" || !decideCapability(actor, "grievances.access.manage", { unionId: data.grievance.unionId, localId: data.grievance.localId }).allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Participant management requires durable database storage" }, { status: 503 });
  const [participant] = await withRlsContext(rls, () => getDb().select().from(grievanceParticipants).where(and(
    eq(grievanceParticipants.id, participantId), eq(grievanceParticipants.grievanceId, id), isNull(grievanceParticipants.revokedAt),
  )).limit(1));
  if (!participant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await withRlsContext(rls, async () => {
    await getDb().update(grievanceParticipants).set({ revokedAt: new Date() }).where(eq(grievanceParticipants.id, participant.id));
    if (data.grievance.assignedStewardId === participant.userId) {
      await grievanceStore.update(id, { assignedStewardId: "" });
    }
  });
  await auditLog.log({ userId: session.user.id, action: "grievance.participant.revoke", resourceType: "grievance_participant", resourceId: participant.id, unionId: data.grievance.unionId, localId: data.grievance.localId });
  return NextResponse.json({ ok: true });
}
