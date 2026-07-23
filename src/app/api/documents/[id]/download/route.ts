import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { isDownloadAllowed } from "@/lib/attachments/scan";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import { documentStore } from "@/lib/documents/store";
import type { UserRole } from "@/types/tenant";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await params;
  const doc = await documentStore.getById(id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (doc.unionId !== session.user.unionId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    !canCrossLocalGrievance(roles) &&
    session.user.localId &&
    doc.localId !== session.user.localId
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isDownloadAllowed(doc.scanStatus)) {
    return NextResponse.json(
      { error: "Document is not available for download" },
      { status: 403 },
    );
  }

  const bytes = await documentStore.readBytes(doc.storageKey);
  if (!bytes) {
    return NextResponse.json(
      { error: "File bytes not found in storage" },
      { status: 404 },
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "document.download",
    resourceType: "document",
    resourceId: doc.id,
    unionId: doc.unionId,
    localId: doc.localId,
  });

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
