import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requirePortalSession } from "@/lib/portal/portal-session";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { grievanceAttachmentShares } from "@/lib/db/schema";
import { withRlsContext } from "@/lib/db/rls-context";
import { attachmentStore } from "@/lib/attachments/store";
import { isDownloadAllowed } from "@/lib/attachments/scan";
import { grievanceStore } from "@/lib/grievance/store";
import { grievanceDbBackend } from "@/lib/db/backend";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

/** Download endpoint for explicitly shared member-safe grievance attachments. */
export async function GET(_request: Request, { params }: Params) {
  const authResult = await requirePortalSession();
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  const { session, actor } = authResult;
  const { id, attachmentId } = await params;
  if (!actor.unionId || !isPostgresConfigured()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (grievanceDbBackend() !== "postgres") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const memberships = actor.memberships.filter((membership) => membership.unionId === actor.unionId);
  let grievance = null;
  for (const membership of memberships) {
    const rows = await withRlsContext({ unionId: actor.unionId, localId: membership.localId, userId: session.user.id }, () =>
      grievanceStore.list({ unionId: actor.unionId!, localId: membership.localId, memberUserId: session.user.id }),
    );
    grievance = rows.find((item) => item.id === id) ?? grievance;
  }
  if (!grievance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const rls = { unionId: actor.unionId, localId: grievance.localId, userId: session.user.id, crossLocal: false };
  const shared = await withRlsContext(rls, () => getDb().select({ id: grievanceAttachmentShares.id })
    .from(grievanceAttachmentShares)
    .where(and(
      eq(grievanceAttachmentShares.grievanceId, id),
      eq(grievanceAttachmentShares.attachmentId, attachmentId),
      isNull(grievanceAttachmentShares.revokedAt),
    )).limit(1));
  if (!shared.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachment = await withRlsContext(rls, () => attachmentStore.getById(attachmentId));
  if (!attachment || attachment.grievanceId !== id || !isDownloadAllowed(attachment.scanStatus)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const bytes = await attachmentStore.readBytes(attachment.storageKey);
  if (!bytes) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.member_attachment_download",
    resourceType: "attachment",
    resourceId: attachment.id,
    unionId: grievance.unionId,
    localId: grievance.localId,
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
