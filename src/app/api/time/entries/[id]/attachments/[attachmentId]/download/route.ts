import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertTimeView,
  requireTimeSession,
} from "@/lib/auth/time-session";
import { isDownloadAllowed } from "@/lib/attachments/scan";
import { attachmentStore } from "@/lib/attachments/store";
import { timeStore } from "@/lib/time/store";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id, attachmentId } = await params;
  const entry = await timeStore.getEntryById(id);
  if (!entry || !assertTimeView(authResult.session, entry)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const attachment = await attachmentStore.getById(attachmentId);
  if (!attachment || attachment.timeEntryId !== id) {
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
    userId: authResult.session.user.id,
    action: "time.punch_photo_download",
    resourceType: "attachment",
    resourceId: attachment.id,
    unionId: entry.unionId,
    localId: entry.localId,
  });

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename="${attachment.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
