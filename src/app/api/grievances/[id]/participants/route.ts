import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { decideCapability } from "@/lib/authorization/model";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { grievanceStore } from "@/lib/grievance/store";
import { grievanceParticipants as participantRows, users } from "@/lib/db/schema";
import { authorizeGrievance, isValidGrievanceParticipant } from "@/lib/grievance/authorization";
import { hasActiveGrievanceLocalMember, listActiveGrievanceLocalMembers } from "@/lib/grievance/local-members";

type Params = { params: Promise<{ id: string }> };

async function loadContext(id: string) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) return { error: authResult.error, status: authResult.status } as const;
  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data) return { error: "Not found", status: 404 } as const;
  const access = await authorizeGrievance(actor, data.grievance);
  if (!access.allowed || !["case_read", "case_write"].includes(access.level)) {
    return { error: "Not found", status: 404 } as const;
  }
  const canManage = access.level === "case_write" && decideCapability(actor, "grievances.access.manage", {
    unionId: data.grievance.unionId, localId: data.grievance.localId,
  }).allowed;
  return { session, actor, rls, data, access, canManage } as const;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const context = await loadContext(id);
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!isPostgresConfigured()) {
    const assigned = context.data.grievance.assignedStewardId;
    return NextResponse.json({
      privacyMode: context.data.grievance.privacyMode ?? "standard",
      participants: assigned ? [{ id: "legacy-primary-case-worker", userId: assigned, name: null, relationship: "case_worker", accessLevel: "case_write", legacy: true }] : [],
      availableMembers: [],
      canManage: context.canManage,
      persistenceAvailable: false,
    });
  }
  const participants = await withRlsContext(context.rls, () => getDb().select({
    id: participantRows.id,
    userId: participantRows.userId,
    name: users.name,
    relationship: participantRows.relationship,
    accessLevel: participantRows.accessLevel,
    createdAt: participantRows.createdAt,
    revokedAt: participantRows.revokedAt,
  }).from(participantRows).innerJoin(users, eq(users.id, participantRows.userId)).where(and(
    eq(participantRows.grievanceId, id), isNull(participantRows.revokedAt),
  )));
  const listed = participants.some((person) => person.userId === context.data.grievance.assignedStewardId);
  const primaryCaseWorker = !listed && context.data.grievance.assignedStewardId
    ? [{ id: "legacy-primary-case-worker", userId: context.data.grievance.assignedStewardId, name: null, relationship: "case_worker", accessLevel: "case_write", legacy: true }]
    : [];
  const availableMembers = context.canManage
    ? (await listActiveGrievanceLocalMembers({
        unionId: context.data.grievance.unionId,
        localId: context.data.grievance.localId,
        rls: context.rls,
      })).map(({ id: userId, name, email }) => ({ userId, name, email }))
    : [];
  return NextResponse.json({
    privacyMode: context.data.grievance.privacyMode ?? "standard",
    participants: [...primaryCaseWorker, ...participants],
    availableMembers,
    canManage: context.canManage,
  });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const context = await loadContext(id);
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.canManage) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Participant management requires durable database storage" }, { status: 503 });
  const body = await request.json().catch(() => null) as { userId?: string; relationship?: string; accessLevel?: string } | null;
  if (!body?.userId || !["member", "case_worker", "representative", "observer"].includes(body.relationship ?? "") || !["member_safe", "summary", "case_read", "case_write"].includes(body.accessLevel ?? "")) {
    return NextResponse.json({ error: "A valid participant and access level are required" }, { status: 400 });
  }
  if (!isValidGrievanceParticipant({ userId: body.userId, relationship: body.relationship!, accessLevel: body.accessLevel! }, context.data.grievance)) {
    return NextResponse.json({ error: "The participant relationship and access level are not valid for this grievance" }, { status: 400 });
  }
  const isActiveMember = await hasActiveGrievanceLocalMember({
    unionId: context.data.grievance.unionId,
    localId: context.data.grievance.localId,
    userId: body.userId,
    rls: context.rls,
  });
  if (!isActiveMember) return NextResponse.json({ error: "Participant must be an active member of this local" }, { status: 400 });
  const [existing] = await withRlsContext(context.rls, () => getDb().select({ id: participantRows.id }).from(participantRows).where(and(
    eq(participantRows.grievanceId, id), eq(participantRows.userId, body.userId!),
  )).limit(1));
  const accessLevel = body.relationship === "member" ? "member_safe" : body.accessLevel;
  const participant = await withRlsContext(context.rls, async () => {
    const db = getDb();
    if (existing) {
      const [row] = await db.update(participantRows).set({
        relationship: body.relationship as typeof participantRows.$inferInsert.relationship,
        accessLevel: accessLevel as typeof participantRows.$inferInsert.accessLevel,
        addedById: context.session.user.id,
        createdAt: new Date(),
        revokedAt: null,
      }).where(eq(participantRows.id, existing.id)).returning();
      if (body.relationship === "case_worker") await grievanceStore.update(id, { assignedStewardId: body.userId });
      return row;
    }
    const [row] = await db.insert(participantRows).values({
      id: randomUUID(), grievanceId: id, userId: body.userId!,
      relationship: body.relationship as typeof participantRows.$inferInsert.relationship,
      accessLevel: accessLevel as typeof participantRows.$inferInsert.accessLevel,
      addedById: context.session.user.id,
    }).returning();
    if (body.relationship === "case_worker") await grievanceStore.update(id, { assignedStewardId: body.userId });
    return row;
  });
  await auditLog.log({ userId: context.session.user.id, action: "grievance.participant.add", resourceType: "grievance_participant", resourceId: participant.id, unionId: context.data.grievance.unionId, localId: context.data.grievance.localId });
  return NextResponse.json({ participant }, { status: existing ? 200 : 201 });
}
