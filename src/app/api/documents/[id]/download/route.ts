import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireDocumentsSession } from "@/lib/auth/documents-session";
import { isDownloadAllowed } from "@/lib/attachments/scan";
import { withRlsContext } from "@/lib/db/rls-context";
import { documentStore } from "@/lib/documents/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireDocumentsSession({ requireOfficer: false });
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const { session, unionId, localId, canReadShared } = authResult;
  const { id } = await params;
  const doc = await withRlsContext({ unionId, localId, userId: session.user.id, mfaVerified: true }, () => documentStore.getById(id, session.user.id, canReadShared));
  if (!doc || doc.unionId !== unionId || doc.localId !== localId || doc.archivedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  if (!isDownloadAllowed(doc.scanStatus)) return NextResponse.json({ error: "Document is not available for download" }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  const stream = await documentStore.readStream(doc.storageKey);
  if (!stream) return NextResponse.json({ error: "File bytes not found in storage" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  await auditLog.log({ userId: session.user.id, action: "document.download", resourceType: "document", resourceId: doc.id, unionId, localId });
  const safeName = doc.fileName.replace(/[\r\n"\\]/g, "_");
  return new NextResponse(stream, { status: 200, headers: {
    "Content-Type": doc.mimeType,
    "Content-Length": String(doc.sizeBytes),
    "Content-Disposition": `attachment; filename="${safeName}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  } });
}
