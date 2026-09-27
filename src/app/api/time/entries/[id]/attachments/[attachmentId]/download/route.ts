import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { isHostedCustomerMode } from "@/lib/auth/mfa-policy";
import { assertTimeView, requireTimeSession } from "@/lib/auth/time-session";
import {
  attachmentsDbBackend,
  auditDbBackend,
  timeDbBackend,
} from "@/lib/db/backend";
import { isDownloadAllowed } from "@/lib/attachments/scan";
import { attachmentStore } from "@/lib/attachments/store";
import { timeStore } from "@/lib/time/store";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

function respond(
  correlation: ReturnType<typeof createAuditRequestContext>,
  body: unknown,
  status: number,
) {
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  return NextResponse.json(body, {
    status,
    headers: correlation.responseHeaders(headers),
  });
}

export async function GET(_request: Request, { params }: Params) {
  const correlation = createAuditRequestContext();
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return respond(correlation, { error: authResult.error }, authResult.status);
  }

  const { id, attachmentId } = await params;
  const entry = await timeStore.getEntryById(id);
  if (!entry || !assertTimeView(authResult.session, entry)) {
    return respond(correlation, { error: "Not found" }, 404);
  }

  const attachment = await attachmentStore.getById(attachmentId);
  if (!attachment || attachment.timeEntryId !== id) {
    return respond(correlation, { error: "Not found" }, 404);
  }
  if (!isDownloadAllowed(attachment.scanStatus)) {
    return respond(
      correlation,
      { error: "Attachment is not available for download" },
      403,
    );
  }
  if (
    isHostedCustomerMode() &&
    (timeDbBackend() !== "postgres" ||
      attachmentsDbBackend() !== "postgres" ||
      auditDbBackend() !== "postgres")
  ) {
    return respond(
      correlation,
      { error: "Durable time, attachment metadata, and audit storage are required." },
      503,
    );
  }

  const record = (
    outcome: "success" | "denied" | "error",
    phase: "download_authorized" | "download_delivered" | "download_failed" | "download_missing",
  ) => auditLog.log({
    userId: authResult.session.user.id,
    action: "time.punch_photo_download",
    resourceType: "attachment",
    resourceId: attachment.id,
    unionId: entry.unionId,
    localId: entry.localId,
    outcome,
    requestId: correlation.requestId,
    metadata: { phase },
  });

  try {
    await record("success", "download_authorized");
  } catch {
    return respond(correlation, { error: "Audit service unavailable" }, 503);
  }

  let bytes: Uint8Array | null;
  try {
    bytes = await attachmentStore.readBytes(attachment.storageKey);
  } catch {
    await record("error", "download_failed").catch(() => undefined);
    return respond(correlation, { error: "Attachment storage is unavailable." }, 503);
  }
  if (!bytes) {
    await record("error", "download_missing").catch(() => undefined);
    return respond(correlation, { error: "File bytes not found in storage" }, 404);
  }
  try {
    await record("success", "download_delivered");
  } catch {
    return respond(
      correlation,
      { error: "The file was not delivered because its result audit could not be confirmed." },
      503,
    );
  }

  const headers = new Headers({
    "Content-Type": attachment.mimeType,
    "Content-Length": String(bytes.length),
    "Content-Disposition": `inline; filename="${attachment.fileName.replace(/"/g, "")}"`,
    "Cache-Control": "private, no-store",
  });
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: correlation.responseHeaders(headers),
  });
}
