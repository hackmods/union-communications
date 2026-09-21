import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { decideCapability, isCrossLocalAdministrator, type Capability } from "@/lib/authorization/model";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { authorityDelegations, localMemberships, locals, users } from "@/lib/db/schema";
import { auditLog } from "@/lib/audit/store";

const DELEGABLE: Capability[] = ["grievances.case.read", "grievances.case.write", "grievances.member_updates.publish"];

async function resolveScope(localId?: string) {
  const session = await auth();
  if (!session?.user?.unionId) return { error: "Unauthorized", status: 401 as const };
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return { error: "Session expired", status: 401 as const };
  const targetLocalId = localId ?? session.user.localId;
  if (!targetLocalId) return { error: "Local context required", status: 400 as const };
  if (!decideCapability(actor, "delegations.manage", { unionId: actor.unionId, localId: targetLocalId }).allowed) {
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
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Delegation management requires Postgres" }, { status: 503 });
  const scope = await resolveScope(new URL(request.url).searchParams.get("localId") ?? undefined);
  if ("error" in scope) return NextResponse.json({ error: scope.error }, { status: scope.status });
  const delegations = await withRlsContext(scope.rls, () => getDb().select({
    id: authorityDelegations.id, capability: authorityDelegations.capability,
    grantorUserId: authorityDelegations.grantorUserId, grantorName: sql<string>`grantor.name`,
    delegateUserId: authorityDelegations.delegateUserId, delegateName: sql<string>`delegate.name`,
    startsAt: authorityDelegations.startsAt, endsAt: authorityDelegations.endsAt,
    reason: authorityDelegations.reason, revokedAt: authorityDelegations.revokedAt,
  }).from(authorityDelegations)
    .innerJoin(sql`users AS grantor`, sql`grantor.id = ${authorityDelegations.grantorUserId}`)
    .innerJoin(sql`users AS delegate`, sql`delegate.id = ${authorityDelegations.delegateUserId}`)
    .where(and(eq(authorityDelegations.unionId, scope.unionId), eq(authorityDelegations.localId, scope.localId)))
    .orderBy(asc(authorityDelegations.startsAt)));
  const now = Date.now();
  return NextResponse.json({ delegations: delegations.map((delegation) => ({
    ...delegation,
    isActive: !delegation.revokedAt && delegation.startsAt.getTime() <= now && delegation.endsAt.getTime() > now,
  })) });
}

export async function POST(request: Request) {
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Delegation management requires Postgres" }, { status: 503 });
  const body = await request.json().catch(() => null) as { localId?: string; delegateUserId?: string; capability?: string; startsAt?: string; endsAt?: string; reason?: string } | null;
  if (!body?.delegateUserId || !body.capability || !body.startsAt || !body.endsAt || !body.reason?.trim() || !DELEGABLE.includes(body.capability as Capability)) {
    return NextResponse.json({ error: "delegateUserId, capability, start, expiry, and reason are required" }, { status: 400 });
  }
  const scope = await resolveScope(body.localId);
  if ("error" in scope) return NextResponse.json({ error: scope.error }, { status: scope.status });
  const capability = body.capability as Capability;
  if (!decideCapability(scope.actor, capability, { unionId: scope.unionId, localId: scope.localId }).allowed) {
    return NextResponse.json({ error: "Delegation exceeds the grantor's authority" }, { status: 403 });
  }
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt || endsAt.getTime() - startsAt.getTime() > 90 * 24 * 60 * 60 * 1000 || body.reason.trim().length > 1000) {
    return NextResponse.json({ error: "Delegation must have valid dates and expire within 90 days" }, { status: 400 });
  }
  const result = await withRlsContext(scope.rls, () => getDb().transaction(async (tx) => {
    const [delegate] = await tx.select({ id: users.id, unionId: users.unionId, archivedAt: users.archivedAt, lockedAt: users.lockedAt }).from(users).where(eq(users.id, body.delegateUserId!)).limit(1);
    if (!delegate || delegate.unionId !== scope.unionId || delegate.archivedAt || delegate.lockedAt) return { error: "Delegate must be an active account in this union" };
    const [membership] = await tx.select({ id: localMemberships.id }).from(localMemberships).where(and(
      eq(localMemberships.unionId, scope.unionId), eq(localMemberships.localId, scope.localId),
      eq(localMemberships.userId, body.delegateUserId!), eq(localMemberships.status, "active"), isNull(localMemberships.endedAt), lte(localMemberships.startedAt, new Date()),
    )).limit(1);
    if (!membership) return { error: "Delegate must be an active member of this local" };
    const [delegation] = await tx.insert(authorityDelegations).values({
      id: randomUUID(), unionId: scope.unionId, localId: scope.localId, capability,
      grantorUserId: scope.session.user.id, delegateUserId: body.delegateUserId!, startsAt, endsAt,
      reason: body.reason!.trim(),
    }).returning();
    return { delegation };
  }));
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  await auditLog.log({ userId: scope.session.user.id, action: "delegation.create", resourceType: "authority_delegation", resourceId: result.delegation.id, unionId: scope.unionId, localId: scope.localId });
  return NextResponse.json({ delegation: result.delegation }, { status: 201 });
}
