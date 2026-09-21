import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability, isCrossLocalAdministrator } from "@/lib/authorization/model";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { localMemberships, locals, officerAssignments, officerRoster, users } from "@/lib/db/schema";
import { auditLog } from "@/lib/audit/store";

const POSITIONS = ["president", "vice_president", "grievance_officer", "steward", "executive_member"] as const;

async function scopeFor(localId?: string) {
  const session = await auth();
  if (!session?.user?.unionId) return { error: "Unauthorized", status: 401 as const };
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return { error: "Session expired", status: 401 as const };
  const targetLocalId = localId ?? session.user.localId;
  if (!targetLocalId) return { error: "Local context required", status: 400 as const };
  if (!decideCapability(actor, "officers.manage", { unionId: actor.unionId, localId: targetLocalId }).allowed) {
    return { error: "Forbidden", status: 403 as const };
  }
  const rls = { unionId: session.user.unionId, localId: targetLocalId, userId: session.user.id, crossLocal: isCrossLocalAdministrator(actor) };
  const [local] = await withRlsContext(rls, () => getDb().select({ id: locals.id }).from(locals)
    .where(and(eq(locals.id, targetLocalId), eq(locals.unionId, session.user.unionId!))).limit(1));
  if (!local) return { error: "Not found", status: 404 as const };
  return {
    session, actor, unionId: session.user.unionId, localId: targetLocalId,
    rls,
  };
}

export async function GET(request: Request) {
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Officer management requires Postgres" }, { status: 503 });
  const localId = new URL(request.url).searchParams.get("localId") ?? undefined;
  const scope = await scopeFor(localId);
  if ("error" in scope) return NextResponse.json({ error: scope.error }, { status: scope.status });
  const [assignments, rosterEntries] = await Promise.all([
    withRlsContext(scope.rls, () => getDb().select({
    id: officerAssignments.id,
    userId: officerAssignments.userId,
    name: users.name,
    email: users.email,
    position: officerAssignments.position,
    officerRosterId: officerAssignments.officerRosterId,
    startsAt: officerAssignments.startsAt,
    endsAt: officerAssignments.endsAt,
    revokedAt: officerAssignments.revokedAt,
  }).from(officerAssignments).innerJoin(users, eq(users.id, officerAssignments.userId))
    .where(and(eq(officerAssignments.unionId, scope.unionId), eq(officerAssignments.localId, scope.localId)))
    .orderBy(asc(officerAssignments.position), asc(officerAssignments.startsAt))),
    withRlsContext(scope.rls, () => getDb().select({
      id: officerRoster.id,
      name: officerRoster.name,
      role: officerRoster.role,
      userId: officerRoster.userId,
      canonicalPosition: officerRoster.canonicalPosition,
    }).from(officerRoster).where(and(
      eq(officerRoster.unionId, scope.unionId), eq(officerRoster.localId, scope.localId),
    )).orderBy(asc(officerRoster.name))),
  ]);
  const now = Date.now();
  return NextResponse.json({ rosterEntries, assignments: assignments.map((assignment) => ({
    ...assignment,
    isActive: !assignment.revokedAt && assignment.startsAt.getTime() <= now && (!assignment.endsAt || assignment.endsAt.getTime() > now),
  })) });
}

export async function POST(request: Request) {
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Officer management requires Postgres" }, { status: 503 });
  const body = await request.json().catch(() => null) as { userId?: string; localId?: string; position?: string; startsAt?: string; endsAt?: string; officerRosterId?: string } | null;
  if (!body?.userId || !POSITIONS.includes(body.position as typeof POSITIONS[number])) {
    return NextResponse.json({ error: "userId and a canonical position are required" }, { status: 400 });
  }
  const scope = await scopeFor(body.localId);
  if ("error" in scope) return NextResponse.json({ error: scope.error }, { status: scope.status });
  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt))) {
    return NextResponse.json({ error: "Invalid office term" }, { status: 400 });
  }
  const result = await withRlsContext(scope.rls, () => getDb().transaction(async (tx) => {
    const [member] = await tx.select({ id: localMemberships.id }).from(localMemberships).where(and(
      eq(localMemberships.unionId, scope.unionId), eq(localMemberships.localId, scope.localId),
      eq(localMemberships.userId, body.userId!), eq(localMemberships.status, "active"),
      isNull(localMemberships.endedAt), lte(localMemberships.startedAt, new Date()),
    )).limit(1);
    if (!member) return { error: "Officer must be an active member of this local" };
    const [target] = await tx.select({ id: users.id, unionId: users.unionId }).from(users).where(eq(users.id, body.userId!)).limit(1);
    if (!target || target.unionId !== scope.unionId) return { error: "Officer must belong to this union" };
    if (body.officerRosterId) {
      const [roster] = await tx.select({ id: officerRoster.id, userId: officerRoster.userId }).from(officerRoster).where(and(
        eq(officerRoster.id, body.officerRosterId), eq(officerRoster.unionId, scope.unionId), eq(officerRoster.localId, scope.localId),
      )).limit(1);
      if (!roster) return { error: "Roster entry not found" };
      if (roster.userId && roster.userId !== body.userId) return { error: "Roster entry is already linked to another account" };
    }
    const [assignment] = await tx.insert(officerAssignments).values({
      id: randomUUID(), unionId: scope.unionId, localId: scope.localId, userId: body.userId!,
      position: body.position as typeof POSITIONS[number], officerRosterId: body.officerRosterId,
      startsAt, endsAt, assignedById: scope.session.user.id,
    }).returning();
    if (body.officerRosterId) await tx.update(officerRoster).set({ userId: body.userId!, canonicalPosition: body.position, updatedAt: new Date() }).where(eq(officerRoster.id, body.officerRosterId));
    await tx.execute(sql`SELECT app_sync_local_portal_membership(${scope.unionId}, ${scope.localId}, ${body.userId})`);
    return { assignment };
  }));
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  await auditLog.log({ userId: scope.session.user.id, action: "officer.assignment.create", resourceType: "officer_assignment", resourceId: result.assignment.id, unionId: scope.unionId, localId: scope.localId });
  return NextResponse.json({ assignment: result.assignment }, { status: 201 });
}
