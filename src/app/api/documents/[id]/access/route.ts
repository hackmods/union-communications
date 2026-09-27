import { and, eq, inArray, isNull, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireDocumentsSession } from "@/lib/auth/documents-session";
import { withRlsContext } from "@/lib/db/rls-context";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { localMemberships, users } from "@/lib/db/schema";
import { documentStore } from "@/lib/documents/store";
import type { AuthorizationActor } from "@/lib/authorization/model";

type Params = { params: Promise<{ id: string }> };

function mayManage(actor: AuthorizationActor, unionId: string, localId: string, userId: string) {
  return actor.assignments.some((assignment) => assignment.unionId === unionId && assignment.localId === localId && ["president", "vice_president"].includes(assignment.position)) || userId === actor.userId;
}

async function activeLocalMemberIds(unionId: string, localId: string, ids: string[]) {
  if (!ids.length) return [];
  const activeAt = new Date();
  const db = getDb();
  const membershipRows = await db.select({ userId: localMemberships.userId }).from(localMemberships).where(and(
    eq(localMemberships.unionId, unionId), eq(localMemberships.localId, localId), eq(localMemberships.status, "active"),
    isNull(localMemberships.endedAt), lte(localMemberships.startedAt, activeAt),
  ));
  const memberIds = new Set(membershipRows.map((row) => row.userId));
  const candidateIds = ids.filter((id) => memberIds.has(id));
  if (!candidateIds.length) return [];
  const activeUsers = await db.select({ id: users.id }).from(users).where(and(
    inArray(users.id, candidateIds), isNull(users.archivedAt), isNull(users.lockedAt),
  ));
  return activeUsers.map((row) => row.id);
}

export async function GET(_request: Request, { params }: Params) {
  const access = await requireDocumentsSession({ requireOfficer: false });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const result = await withRlsContext({ unionId: access.unionId, localId: access.localId, userId: access.session.user.id, mfaVerified: true }, async () => {
    const doc = await documentStore.getByIdForManagement(id);
    if (!doc || doc.unionId !== access.unionId || doc.localId !== access.localId) return { status: 404 as const };
    if (doc.visibility !== "restricted") return { status: 400 as const };
    if (!mayManage(access.actor, access.unionId, access.localId, doc.uploadedById)) return { status: 403 as const };
    return { status: 200 as const, userIds: await documentStore.accessGrants(id) };
  });
  if (result.status !== 200) return NextResponse.json({ error: result.status === 404 ? "Not found" : result.status === 403 ? "Forbidden" : "Document is not restricted" }, { status: result.status });
  return NextResponse.json({ userIds: result.userIds }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request, { params }: Params) {
  const access = await requireDocumentsSession({ requireOfficer: false });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Malformed JSON" }, { status: 400 }); }
  const ids = (payload as { userIds?: unknown })?.userIds;
  if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => typeof id !== "string" || id.length > 200)) {
    return NextResponse.json({ error: "userIds must be an array of at most 100 user IDs" }, { status: 400 });
  }
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Restricted grants require the Postgres membership directory" }, { status: 409 });
  const userIds = [...new Set(ids as string[])];
  const { id } = await params;
  const result = await withRlsContext({ unionId: access.unionId, localId: access.localId, userId: access.session.user.id, mfaVerified: true }, async () => {
    const doc = await documentStore.getByIdForManagement(id);
    if (!doc || doc.unionId !== access.unionId || doc.localId !== access.localId) return { status: 404 as const };
    if (doc.visibility !== "restricted") return { status: 400 as const };
    if (!mayManage(access.actor, access.unionId, access.localId, doc.uploadedById)) return { status: 403 as const };
    const active = await activeLocalMemberIds(access.unionId, access.localId, userIds);
    if (active.length !== userIds.length) return { status: 400 as const, error: "Every grant must belong to an active user in this local" };
    await documentStore.setAccessGrants(id, active, access.session.user.id);
    return { status: 200 as const };
  });
  if (result.status !== 200) return NextResponse.json({ error: "error" in result ? result.error : result.status === 404 ? "Not found" : result.status === 403 ? "Forbidden" : "Document is not restricted" }, { status: result.status });
  await auditLog.log({ userId: access.session.user.id, action: "document.access.update", resourceType: "document", resourceId: id, unionId: access.unionId, localId: access.localId, metadata: { granteeCount: String(userIds.length) } });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
