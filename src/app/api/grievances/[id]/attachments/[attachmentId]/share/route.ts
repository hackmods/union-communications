import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { decideCapability } from "@/lib/authorization/model";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { grievanceAttachmentShares } from "@/lib/db/schema";
import { attachmentStore } from "@/lib/attachments/store";
import { grievanceStore } from "@/lib/grievance/store";
import { authorizeGrievance } from "@/lib/grievance/authorization";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

async function resolveCase(id: string) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) return { error: authResult.error, status: authResult.status } as const;
  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data) return { error: "Not found", status: 404 } as const;
  const access = await authorizeGrievance(actor, data.grievance);
  if (!access.allowed || !["case_read", "case_write"].includes(access.level)) return { error: "Not found", status: 404 } as const;
  const canManage = access.level === "case_write" && decideCapability(actor, "grievances.access.manage", { unionId: data.grievance.unionId, localId: data.grievance.localId }).allowed;
  return { session, actor, rls, data, canManage } as const;
}

export async function GET(_request: Request, { params }: Params) {
  const { id, attachmentId } = await params;
  const context = await resolveCase(id);
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const attachment = await withRlsContext(context.rls, () => attachmentStore.getById(attachmentId));
  if (!attachment || attachment.grievanceId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isPostgresConfigured()) return NextResponse.json({ shared: false, canManage: context.canManage, persistenceAvailable: false });
  const [share] = await withRlsContext(context.rls, () => getDb().select({ id: grievanceAttachmentShares.id })
    .from(grievanceAttachmentShares).where(and(
      eq(grievanceAttachmentShares.grievanceId, id), eq(grievanceAttachmentShares.attachmentId, attachmentId), isNull(grievanceAttachmentShares.revokedAt),
    )).limit(1));
  return NextResponse.json({ shared: Boolean(share), canManage: context.canManage });
}

export async function PUT(_request: Request, { params }: Params) {
  return setShare(params, true);
}

export async function DELETE(_request: Request, { params }: Params) {
  return setShare(params, false);
}

async function setShare(params: Params["params"], shared: boolean) {
  const { id, attachmentId } = await params;
  const context = await resolveCase(id);
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.canManage) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Attachment sharing requires durable database storage" }, { status: 503 });
  const attachment = await withRlsContext(context.rls, () => attachmentStore.getById(attachmentId));
  if (!attachment || attachment.grievanceId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await withRlsContext(context.rls, async () => {
    const db = getDb();
    const [existing] = await db.select().from(grievanceAttachmentShares).where(and(
      eq(grievanceAttachmentShares.grievanceId, id), eq(grievanceAttachmentShares.attachmentId, attachmentId),
    )).limit(1);
    if (shared) {
      if (existing) {
        if (existing.revokedAt) return (await db.update(grievanceAttachmentShares).set({ revokedAt: null, sharedAt: new Date(), sharedById: context.session.user.id }).where(eq(grievanceAttachmentShares.id, existing.id)).returning())[0];
        return existing;
      }
      return (await db.insert(grievanceAttachmentShares).values({ id: randomUUID(), grievanceId: id, attachmentId, sharedById: context.session.user.id }).returning())[0];
    }
    if (!existing || existing.revokedAt) return existing;
    return (await db.update(grievanceAttachmentShares).set({ revokedAt: new Date() }).where(eq(grievanceAttachmentShares.id, existing.id)).returning())[0];
  });
  await auditLog.log({
    userId: context.session.user.id,
    action: shared ? "grievance.attachment.share" : "grievance.attachment.unshare",
    resourceType: "attachment",
    resourceId: attachmentId,
    unionId: context.data.grievance.unionId,
    localId: context.data.grievance.localId,
  });
  return NextResponse.json({ shared: Boolean(result && !result.revokedAt) });
}
