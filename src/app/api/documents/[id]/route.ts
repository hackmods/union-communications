import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireDocumentsSession } from "@/lib/auth/documents-session";
import { withRlsContext } from "@/lib/db/rls-context";
import { documentStore } from "@/lib/documents/store";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireDocumentsSession();
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const { session, unionId, localId, actor } = authResult;
  const { id } = await params;
  const result = await withRlsContext({ unionId, localId, userId: session.user.id, mfaVerified: true }, async () => {
    const doc = await documentStore.getByIdForManagement(id);
    if (!doc || doc.unionId !== unionId || doc.localId !== localId) return { status: 404 as const, doc: null };
    const leader = actor.assignments.some((a) => a.unionId === unionId && a.localId === localId && ["president", "vice_president"].includes(a.position));
    if (doc.uploadedById !== session.user.id && !leader) return { status: 403 as const, doc };
    const archived = await documentStore.archive(id, session.user.id);
    return { status: archived ? 200 as const : 404 as const, doc };
  });
  if (result.status !== 200 || !result.doc) return NextResponse.json({ error: result.status === 404 ? "Not found" : "Forbidden" }, { status: result.status });
  await auditLog.log({ userId: session.user.id, action: "document.archive", resourceType: "document", resourceId: id, unionId, localId });
  return NextResponse.json({ ok: true });
}

export async function PATCH(_request: Request, { params }: Params) {
  const authResult = await requireDocumentsSession();
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const { session, unionId, localId, actor } = authResult;
  const { id } = await params;
  const result = await withRlsContext({ unionId, localId, userId: session.user.id, mfaVerified: true }, async () => {
    const doc = await documentStore.getByIdForManagement(id);
    if (!doc || doc.unionId !== unionId || doc.localId !== localId) return false;
    const leader = actor.assignments.some((a) => a.unionId === unionId && a.localId === localId && ["president", "vice_president"].includes(a.position));
    if (doc.uploadedById !== session.user.id && !leader) return false;
    return documentStore.restore(id);
  });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await auditLog.log({ userId: session.user.id, action: "document.restore", resourceType: "document", resourceId: id, unionId, localId });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request, { params }: Params) {
  const authResult = await requireDocumentsSession();
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  let body: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    body = value as Record<string, unknown>;
  } catch { return NextResponse.json({ error: "Malformed JSON" }, { status: 400 }); }
  const allowed = new Set(["title", "category", "description", "visibility", "legalHold", "retentionUntil"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) return NextResponse.json({ error: "Unknown metadata field" }, { status: 400 });
  const { session, unionId, localId, actor } = authResult;
  const { id } = await params;
  const result = await withRlsContext({ unionId, localId, userId: session.user.id, mfaVerified: true }, async () => {
    const doc = await documentStore.getByIdForManagement(id);
    if (!doc || doc.unionId !== unionId || doc.localId !== localId || doc.archivedAt) return { status: 404 as const };
    const leader = actor.assignments.some((a) => a.unionId === unionId && a.localId === localId && ["president", "vice_president"].includes(a.position));
    if (doc.uploadedById !== session.user.id && !leader) return { status: 403 as const };
    const patch: Parameters<typeof documentStore.updateMetadata>[1] = {};
    if ("title" in body) {
      if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 200) return { status: 400 as const, error: "Title must be 1 to 200 characters" };
      patch.title = body.title.trim();
    }
    if ("category" in body) {
      if (body.category !== null && (typeof body.category !== "string" || body.category.length > 120)) return { status: 400 as const, error: "Category must be at most 120 characters" };
      patch.category = typeof body.category === "string" ? body.category.trim() || null : null;
    }
    if ("description" in body) {
      if (body.description !== null && (typeof body.description !== "string" || body.description.length > 2000)) return { status: 400 as const, error: "Description must be at most 2000 characters" };
      patch.description = typeof body.description === "string" ? body.description.trim() || null : null;
    }
    if ("visibility" in body) {
      if (body.visibility !== "local_shared" && body.visibility !== "restricted") return { status: 400 as const, error: "Invalid visibility" };
      patch.visibility = body.visibility;
    }
    if ("legalHold" in body || "retentionUntil" in body) {
      if (!leader) return { status: 403 as const };
      if ("legalHold" in body) {
        if (typeof body.legalHold !== "boolean") return { status: 400 as const, error: "legalHold must be boolean" };
        patch.legalHold = body.legalHold;
      }
      if ("retentionUntil" in body) {
        if (body.retentionUntil !== null && typeof body.retentionUntil !== "string") return { status: 400 as const, error: "retentionUntil must be an ISO timestamp or null" };
        const date = typeof body.retentionUntil === "string" ? new Date(body.retentionUntil) : null;
        if (date && Number.isNaN(date.getTime())) return { status: 400 as const, error: "Invalid retention date" };
        patch.retentionUntil = date?.toISOString() ?? null;
      }
    }
    const updated = await documentStore.updateMetadata(id, patch);
    return updated ? { status: 200 as const, document: updated } : { status: 404 as const };
  });
  if (result.status !== 200) return NextResponse.json({ error: "error" in result ? result.error : result.status === 404 ? "Not found" : "Forbidden" }, { status: result.status });
  await auditLog.log({ userId: session.user.id, action: "document.metadata.update", resourceType: "document", resourceId: id, unionId, localId, metadata: { fields: Object.keys(body).sort() } });
  return NextResponse.json({ document: result.document }, { headers: { "Cache-Control": "private, no-store" } });
}
