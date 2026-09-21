import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertGrievanceView,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { isDownloadAllowed } from "@/lib/attachments/scan";
import { attachmentStore } from "@/lib/attachments/store";
import { grievanceStore } from "@/lib/grievance/store";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const { id, attachmentId } = await params;
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data || !await assertGrievanceView(actor, data.grievance)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const attachment = await withRlsContext(rls, () =>
    attachmentStore.getById(attachmentId),
  );
  if (!attachment || attachment.grievanceId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isDownloadAllowed(attachment.scanStatus)) {
    return NextResponse.json(
      { error: "Attachment is not available for download" },
      { status: 403 },
    );
  }

  const bytes = await attachmentStore.readBytes(attachment.storageKey);
  if (!bytes) {
    return NextResponse.json(
      { error: "File bytes not found in storage" },
      { status: 404 },
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.attachment_download",
    resourceType: "attachment",
    resourceId: attachment.id,
    unionId: data.grievance.unionId,
    localId: data.grievance.localId,
  });

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${attachment.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
