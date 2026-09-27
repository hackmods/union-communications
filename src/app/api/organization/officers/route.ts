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
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";

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
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("Cache-Control", "private, no-store");
    return NextResponse.json(body, { ...init, headers: correlation.responseHeaders(headers) });
  };

  if (!isPostgresConfigured()) return respond({ error: "Officer management requires Postgres" }, { status: 503 });
  const body = await request.json().catch(() => null) as {
    userId?: string;
    localId?: string;
    position?: string;
    startsAt?: string;
    endsAt?: string;
    officerRosterId?: string;
    mfaCode?: string;
  } | null;
  if (!body?.userId || !POSITIONS.includes(body.position as typeof POSITIONS[number])) {
    return respond({ error: "userId and a canonical position are required" }, { status: 400 });
  }
  if (body.mfaCode !== undefined && (typeof body.mfaCode !== "string" || body.mfaCode.length > 32)) {
    return respond({ error: "Invalid MFA challenge" }, { status: 400 });
  }
  const scope = await scopeFor(body.localId);
  if ("error" in scope) return respond({ error: scope.error }, { status: scope.status });
  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    resourceId: string,
    metadata?: Record<string, string>,
  ) => auditLog.log({
    userId: scope.session.user.id!,
    action: "officer.assignment.create",
    resourceType: "officer_assignment",
    resourceId,
    unionId: scope.unionId,
    localId: scope.localId,
    outcome,
    requestId: correlation.requestId,
    metadata,
  });
  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt))) {
    await recordOutcome("denied", body.userId, { reason: "invalid_office_term" });
    return respond({ error: "Invalid office term" }, { status: 400 });
  }
  const challenge = await verifyFreshMfaStepUp({
    userId: scope.session.user.id!,
    code: body.mfaCode,
  });
  if (!challenge.ok) {
    await recordOutcome(challenge.outcome, body.userId, { reason: `mfa_step_up_${challenge.code}` });
    return respond(
      {
        error: challenge.code === "required" ? "A fresh MFA code is required for this authority change." : "Fresh MFA verification failed.",
        code: `mfa_step_up_${challenge.code}`,
      },
      {
        status: challenge.status,
        ...(challenge.retryAfterSeconds
          ? { headers: { "Retry-After": String(challenge.retryAfterSeconds) } }
          : {}),
      },
    );
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
    // Office assignment can grant privileged casework capabilities; stale
    // sessions must re-authenticate with MFA before using the new authority.
    await tx.execute(sql`UPDATE users SET session_version = session_version + 1 WHERE id = ${target.id}`);
    if (body.officerRosterId) await tx.update(officerRoster).set({ userId: body.userId!, canonicalPosition: body.position, updatedAt: new Date() }).where(eq(officerRoster.id, body.officerRosterId));
    await tx.execute(sql`SELECT app_sync_local_portal_membership(${scope.unionId}, ${scope.localId}, ${body.userId})`);
    return { assignment };
  }));
  if ("error" in result) {
    await recordOutcome("denied", body.userId, { reason: "membership_or_roster_validation" });
    return respond({ error: result.error }, { status: 400 });
  }
  await recordOutcome("success", result.assignment.id, {
    position: result.assignment.position,
  });
  return respond({ assignment: result.assignment }, { status: 201 });
}
