import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { attachmentStore } from "@/lib/attachments/store";
import { isDownloadAllowed } from "@/lib/attachments/scan";
import { isHostedCustomerMode } from "@/lib/auth/mfa-policy";
import { auditDbBackend, attachmentsDbBackend, grievanceDbBackend } from "@/lib/db/backend";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { grievanceAttachmentShares } from "@/lib/db/schema";
import { grievanceStore } from "@/lib/grievance/store";
import { requirePortalSession } from "@/lib/portal/portal-session";

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

/** Download endpoint for explicitly shared member-safe grievance attachments. */
export async function GET(_request: Request, { params }: Params) {
  const correlation = createAuditRequestContext();
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return respond(correlation, { error: authResult.error }, authResult.status);
  }
  const { session, actor } = authResult;
  const { id, attachmentId } = await params;
  if (!actor.unionId || !isPostgresConfigured() || grievanceDbBackend() !== "postgres") {
    return respond(correlation, { error: "Not found" }, 404);
  }
  const memberships = actor.memberships.filter((membership) => membership.unionId === actor.unionId);
  let grievance = null;
  for (const membership of memberships) {
    const rows = await withRlsContext(
      { unionId: actor.unionId, localId: membership.localId, userId: session.user.id },
      () => grievanceStore.list({
        unionId: actor.unionId!,
        localId: membership.localId,
        memberUserId: session.user.id,
      }),
    );
    grievance = rows.find((item) => item.id === id) ?? grievance;
  }
  if (!grievance) return respond(correlation, { error: "Not found" }, 404);

  const rls = {
    unionId: actor.unionId,
    localId: grievance.localId,
    userId: session.user.id,
    crossLocal: false,
  };
  const shared = await withRlsContext(rls, () => getDb().select({ id: grievanceAttachmentShares.id })
    .from(grievanceAttachmentShares)
    .where(and(
      eq(grievanceAttachmentShares.grievanceId, id),
      eq(grievanceAttachmentShares.attachmentId, attachmentId),
      isNull(grievanceAttachmentShares.revokedAt),
    )).limit(1));
  if (!shared.length) return respond(correlation, { error: "Not found" }, 404);

  const attachment = await withRlsContext(rls, () => attachmentStore.getById(attachmentId));
  if (!attachment || attachment.grievanceId !== id || !isDownloadAllowed(attachment.scanStatus)) {
    return respond(correlation, { error: "Not found" }, 404);
  }
  if (
    isHostedCustomerMode() &&
    (auditDbBackend() !== "postgres" || attachmentsDbBackend() !== "postgres")
  ) {
    return respond(
      correlation,
      { error: "Durable audit and attachment metadata are required." },
      503,
    );
  }

  const record = (
    outcome: "success" | "denied" | "error",
    phase: "download_authorized" | "download_delivered" | "download_failed" | "download_missing",
  ) => auditLog.log({
    userId: session.user.id,
    action: "grievance.member_attachment_download",
    resourceType: "attachment",
    resourceId: attachment.id,
    unionId: grievance.unionId,
    localId: grievance.localId,
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
    bytes = await withRlsContext(rls, () => attachmentStore.readBytes(attachment.storageKey));
  } catch {
    await record("error", "download_failed").catch(() => undefined);
    return respond(correlation, { error: "Attachment storage is unavailable." }, 503);
  }
  if (!bytes) {
    await record("error", "download_missing").catch(() => undefined);
    return respond(correlation, { error: "Not found" }, 404);
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
    "Content-Disposition": `attachment; filename="${attachment.fileName.replace(/"/g, "")}"`,
    "Cache-Control": "private, no-store",
  });
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: correlation.responseHeaders(headers),
  });
}
