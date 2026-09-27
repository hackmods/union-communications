import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireDocumentsSession } from "@/lib/auth/documents-session";
import { withRlsContext } from "@/lib/db/rls-context";
import { documentStore } from "@/lib/documents/store";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function GET(request: Request = new Request("http://localhost/api/documents")) {
  const authResult = await requireDocumentsSession({ requireOfficer: false });
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const { session, unionId, localId } = authResult;
  const documents = await withRlsContext({ unionId, localId, userId: session.user.id, mfaVerified: true }, () =>
    documentStore.list({ unionId, localId, bargainingUnitId: session.user.bargainingUnitId, userId: session.user.id, canReadShared: authResult.canReadShared, includeArchived: new URL(request.url).searchParams.get("archived") === "1" }),
  );
  await auditLog.log({ userId: session.user.id, action: "document.list", resourceType: "document", resourceId: "*", unionId, localId });
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const authResult = await requireDocumentsSession();
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const { session, unionId, localId } = authResult;
  const rawLength = request.headers.get("content-length");
  const declaredLength = rawLength === null ? Number.NaN : Number(rawLength);
  const multipartUpload = request.headers.get("content-type")?.includes("multipart/form-data") ?? false;
  if (multipartUpload && (!Number.isSafeInteger(declaredLength) || declaredLength < 1)) {
    return NextResponse.json({ error: "A bounded Content-Length is required for uploads" }, { status: 411 });
  }
  if (rawLength !== null && (!Number.isSafeInteger(declaredLength) || declaredLength < 1)) {
    return NextResponse.json({ error: "Invalid Content-Length" }, { status: 400 });
  }
  if (Number.isSafeInteger(declaredLength) && declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Upload exceeds 10 MB" }, { status: 413 });
  }

  let title: string | undefined;
  let category: string | undefined;
  let description: string | undefined;
  let fileName: string | undefined;
  let mimeType: string | undefined;
  let visibility: "local_shared" | "restricted" = "local_shared";
  let bytes: Buffer;
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
      if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Upload must be between 1 byte and 10 MB" }, { status: 413 });
      title = String(form.get("title") ?? "").trim();
      category = String(form.get("category") ?? "").trim() || undefined;
      description = String(form.get("description") ?? "").trim() || undefined;
      const rawVisibility = String(form.get("visibility") ?? "local_shared");
      if (rawVisibility !== "local_shared" && rawVisibility !== "restricted") return NextResponse.json({ error: "Invalid document visibility" }, { status: 400 });
      visibility = rawVisibility;
      fileName = file.name;
      mimeType = file.type;
      bytes = Buffer.from(await file.arrayBuffer());
    } else {
      // Keep the legacy contract during the staged client migration.
      const body = await request.json() as { title?: string; category?: string; description?: string; fileName?: string; mimeType?: string; sizeBytes?: number; contentBase64?: string; visibility?: "local_shared" | "restricted" };
      title = body.title?.trim(); category = body.category; description = body.description; fileName = body.fileName; mimeType = body.mimeType;
      if (body.visibility && body.visibility !== "local_shared" && body.visibility !== "restricted") return NextResponse.json({ error: "Invalid document visibility" }, { status: 400 });
      visibility = body.visibility ?? "local_shared";
      if (!body.contentBase64) return NextResponse.json({ error: "file is required" }, { status: 400 });
      bytes = Buffer.from(body.contentBase64, "base64");
      if (bytes.length !== body.sizeBytes) return NextResponse.json({ error: "sizeBytes does not match file length" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Malformed upload" }, { status: 400 });
  }
  if (!title || !fileName || !mimeType) return NextResponse.json({ error: "title and file are required" }, { status: 400 });
  if (bytes.length < 1 || bytes.length > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Upload must be between 1 byte and 10 MB" }, { status: 413 });

  const result = await withRlsContext({ unionId, localId, userId: session.user.id, mfaVerified: true }, () =>
    documentStore.create({ title, category, description, fileName, mimeType, sizeBytes: bytes.length, contentBytes: bytes, localId, bargainingUnitId: session.user.bargainingUnitId, visibility },
      { unionId, localId, bargainingUnitId: session.user.bargainingUnitId, uploadedById: session.user.id }),
  );
  if (result.error || !result.document) return NextResponse.json({ error: result.error ?? "Upload failed" }, { status: 400 });
  await auditLog.log({ userId: session.user.id, action: "document.create", resourceType: "document", resourceId: result.document.id, unionId, localId });
  return NextResponse.json({ document: result.document }, { status: 201 });
}
