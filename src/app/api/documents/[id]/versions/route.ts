import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireDocumentsSession } from "@/lib/auth/documents-session";
import { withRlsContext } from "@/lib/db/rls-context";
import { documentStore } from "@/lib/documents/store";

type Params = { params: Promise<{ id: string }> };
const MAX_BYTES = 10 * 1024 * 1024;

export async function GET(_request: Request, { params }: Params) {
  const access = await requireDocumentsSession({ requireOfficer: false });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const versions = await withRlsContext({ unionId: access.unionId, localId: access.localId, userId: access.session.user.id, mfaVerified: true }, async () => {
    const doc = await documentStore.getById(id, access.session.user.id, access.canReadShared);
    if (!doc || doc.unionId !== access.unionId || doc.localId !== access.localId) return null;
    return documentStore.versions(id);
  });
  if (!versions) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ versions }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, { params }: Params) {
  const access = await requireDocumentsSession();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const rawLength = request.headers.get("content-length");
  const length = rawLength === null ? Number.NaN : Number(rawLength);
  if (!Number.isSafeInteger(length) || length < 1) return NextResponse.json({ error: "A bounded Content-Length is required for uploads" }, { status: 411 });
  if (length > MAX_BYTES + 64 * 1024) return NextResponse.json({ error: "Upload exceeds 10 MB" }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Malformed upload" }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_BYTES) return NextResponse.json({ error: "Upload must be between 1 byte and 10 MB" }, { status: 413 });
  const result = await withRlsContext({ unionId: access.unionId, localId: access.localId, userId: access.session.user.id, mfaVerified: true }, async () => {
    const doc = await documentStore.getById(id, access.session.user.id);
    if (!doc || doc.unionId !== access.unionId || doc.localId !== access.localId) return { status: 404 as const };
    const leader = access.actor.assignments.some((a) => a.unionId === access.unionId && a.localId === access.localId && ["president", "vice_president"].includes(a.position));
    if (doc.uploadedById !== access.session.user.id && !leader) return { status: 403 as const };
    const bytes = Buffer.from(await file.arrayBuffer());
    const published = await documentStore.replaceVersion(id, {
      title: String(form.get("title") ?? doc.title).trim() || doc.title,
      category: String(form.get("category") ?? doc.category ?? "").trim() || undefined,
      description: String(form.get("description") ?? doc.description ?? "").trim() || undefined,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: bytes.length,
      contentBytes: bytes,
    }, access.session.user.id);
    return published.error || !published.document ? { status: 400 as const, error: published.error ?? "Upload failed" } : { status: 200 as const, document: published.document };
  });
  if (result.status !== 200) return NextResponse.json({ error: result.status === 403 ? "Forbidden" : result.status === 404 ? "Not found" : result.error }, { status: result.status });
  await auditLog.log({ userId: access.session.user.id, action: "document.version.create", resourceType: "document", resourceId: id, unionId: access.unionId, localId: access.localId });
  return NextResponse.json({ document: result.document }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request, { params }: Params) {
  const access = await requireDocumentsSession();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Malformed JSON" }, { status: 400 }); }
  const version = (body as { version?: unknown })?.version;
  if (!Number.isInteger(version) || Number(version) < 1) return NextResponse.json({ error: "A positive version number is required" }, { status: 400 });
  const { id } = await params;
  const result = await withRlsContext({ unionId: access.unionId, localId: access.localId, userId: access.session.user.id, mfaVerified: true }, async () => {
    const doc = await documentStore.getById(id, access.session.user.id);
    if (!doc || doc.unionId !== access.unionId || doc.localId !== access.localId) return { status: 404 as const };
    const leader = access.actor.assignments.some((a) => a.unionId === access.unionId && a.localId === access.localId && ["president", "vice_president"].includes(a.position));
    if (doc.uploadedById !== access.session.user.id && !leader) return { status: 403 as const };
    const restored = await documentStore.restoreVersion(id, Number(version), access.session.user.id);
    return restored.document ? { status: 200 as const, document: restored.document } : { status: 409 as const, error: restored.error ?? "Version restore failed" };
  });
  if (result.status !== 200) return NextResponse.json({ error: "error" in result ? result.error : result.status === 404 ? "Not found" : "Forbidden" }, { status: result.status });
  await auditLog.log({ userId: access.session.user.id, action: "document.version.restore", resourceType: "document", resourceId: id, unionId: access.unionId, localId: access.localId, metadata: { sourceVersion: Number(version) } });
  return NextResponse.json({ document: result.document }, { headers: { "Cache-Control": "private, no-store" } });
}
