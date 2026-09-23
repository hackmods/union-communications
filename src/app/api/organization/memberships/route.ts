import { and, asc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveAuthorizationActor, } from "@/lib/authorization/resolve-actor";
import { decideCapability, isCrossLocalAdministrator } from "@/lib/authorization/model";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { localMemberships, locals, unions, users } from "@/lib/db/schema";
import { auditLog } from "@/lib/audit/store";

async function requestScope(inputLocalId?: string) {
  const session = await auth();
  if (!session?.user?.unionId) return { error: "Unauthorized", status: 401 as const };
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return { error: "Session expired", status: 401 as const };
  const localId = inputLocalId ?? session.user.localId;
  if (!localId) return { error: "Local context required", status: 400 as const };
  if (!decideCapability(actor, "memberships.manage", { unionId: actor.unionId, localId }).allowed) {
    return { error: "Forbidden", status: 403 as const };
  }
  const rls = { unionId: session.user.unionId, localId, userId: session.user.id, crossLocal: isCrossLocalAdministrator(actor) };
  const localRows = await withRlsContext(rls, () => getDb().select({ id: locals.id }).from(locals)
    .where(and(eq(locals.id, localId), eq(locals.unionId, session.user.unionId!))).limit(1));
  if (!localRows.length) return { error: "Not found", status: 404 as const };
  return {
    session,
    actor,
    unionId: session.user.unionId,
    localId,
    rls,
  };
}

export async function GET(request: Request) {
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Membership management requires Postgres" }, { status: 503 });
  const localId = new URL(request.url).searchParams.get("localId") ?? undefined;
  const scope = await requestScope(localId);
  if ("error" in scope) return NextResponse.json({ error: scope.error }, { status: scope.status });
  const memberships = await withRlsContext(scope.rls, () => getDb().select({
    id: localMemberships.id,
    localId: localMemberships.localId,
    userId: localMemberships.userId,
    name: users.name,
    email: users.email,
    lockedAt: users.lockedAt,
    archivedAt: users.archivedAt,
    status: localMemberships.status,
    isPrimary: localMemberships.isPrimary,
    startedAt: localMemberships.startedAt,
    endedAt: localMemberships.endedAt,
  }).from(localMemberships).innerJoin(users, eq(users.id, localMemberships.userId))
    .where(and(eq(localMemberships.unionId, scope.unionId), eq(localMemberships.localId, scope.localId)))
    .orderBy(asc(users.name)));
  const unionUsers = await withRlsContext(scope.rls, () => getDb().select({
    id: users.id, name: users.name, email: users.email,
  }).from(users).where(and(
    eq(users.unionId, scope.unionId),
    sql`${users.archivedAt} IS NULL`,
    sql`${users.lockedAt} IS NULL`,
  )).orderBy(asc(users.name)));
  const currentUserIds = new Set(memberships.map((membership) => membership.userId));
  const candidates = unionUsers.filter((user) => !currentUserIds.has(user.id));
  return NextResponse.json({
    memberships: memberships.map(({ lockedAt, archivedAt, ...membership }) => ({
      ...membership,
      accountStatus: archivedAt ? "archived" : lockedAt ? "locked" : "active",
    })),
    candidates,
  });
}

export async function POST(request: Request) {
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Membership management requires Postgres" }, { status: 503 });
  const body = await request.json().catch(() => null) as {
    userId?: string;
    localId?: string;
    replaceActiveMembership?: boolean;
  } | null;
  if (!body?.userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  const scope = await requestScope(body.localId);
  if ("error" in scope) return NextResponse.json({ error: scope.error }, { status: scope.status });
  const rls = scope.rls;
  const result = await withRlsContext(rls, () => getDb().transaction(async (tx) => {
    const [target] = await tx.select({ id: users.id, unionId: users.unionId, accessibleLocalIds: users.accessibleLocalIds, lockedAt: users.lockedAt, archivedAt: users.archivedAt })
      .from(users).where(eq(users.id, body.userId!)).limit(1);
    if (!target || target.unionId !== scope.unionId || target.lockedAt || target.archivedAt) return { error: "User must be an active account in this union", status: 400 as const };

    const [unionRow] = await tx
      .select({ membershipPolicy: unions.membershipPolicy })
      .from(unions)
      .where(eq(unions.id, scope.unionId))
      .limit(1);
    const policy = unionRow?.membershipPolicy ?? "multi_local";

    const otherActive = await tx.select({ id: localMemberships.id, localId: localMemberships.localId })
      .from(localMemberships)
      .where(and(
        eq(localMemberships.unionId, scope.unionId),
        eq(localMemberships.userId, target.id),
        eq(localMemberships.status, "active"),
        sql`${localMemberships.endedAt} IS NULL`,
        sql`${localMemberships.localId} <> ${scope.localId}`,
      ));

    if (policy === "single_local" && otherActive.length > 0 && !body.replaceActiveMembership) {
      return {
        error: "This union allows only one active local per member",
        status: 409 as const,
        code: "single_local_conflict" as const,
      };
    }
    if (policy === "single_local" && otherActive.length > 0) {
      const nowEnd = new Date();
      for (const other of otherActive) {
        await tx.update(localMemberships).set({
          status: "inactive",
          endedAt: nowEnd,
          isPrimary: false,
        }).where(eq(localMemberships.id, other.id));
        await tx.execute(sql`SELECT app_revoke_local_portal_membership(${scope.unionId}, ${other.localId}, ${target.id})`);
      }
    }

    const [existing] = await tx.select().from(localMemberships).where(and(
      eq(localMemberships.userId, target.id), eq(localMemberships.localId, scope.localId), eq(localMemberships.unionId, scope.unionId),
    )).limit(1);
    if (existing?.status === "active" && !existing.endedAt) {
      await tx.execute(sql`SELECT app_sync_local_portal_membership(${scope.unionId}, ${scope.localId}, ${target.id})`);
      return { membership: existing, unchanged: true };
    }
    const now = new Date();
    const membership = existing
      ? (await tx.update(localMemberships).set({ status: "active", startedAt: now, endedAt: null })
          .where(eq(localMemberships.id, existing.id)).returning())[0]
      : (await tx.insert(localMemberships).values({
          id: randomUUID(), unionId: scope.unionId, localId: scope.localId, userId: target.id,
          status: "active", isPrimary: false, startedAt: now, createdById: scope.session.user.id,
        }).returning())[0];
    const accessible = Array.isArray(target.accessibleLocalIds) ? target.accessibleLocalIds : [];
    await tx.execute(sql`UPDATE users SET accessible_local_ids = ${JSON.stringify([...new Set([...accessible, scope.localId])])}::jsonb, session_version = session_version + 1 WHERE id = ${target.id}`);
    await tx.execute(sql`SELECT app_sync_local_portal_membership(${scope.unionId}, ${scope.localId}, ${target.id})`);
    return { membership, unchanged: false };
  }));
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error, ...("code" in result ? { code: result.code } : {}) },
      { status: result.status },
    );
  }
  await auditLog.log({ userId: scope.session.user.id, action: "membership.activate", resourceType: "local_membership", resourceId: result.membership.id, unionId: scope.unionId, localId: scope.localId });
  return NextResponse.json({ membership: result.membership }, { status: result.unchanged ? 200 : 201 });
}
