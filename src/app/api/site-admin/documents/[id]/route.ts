import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requirePublicDocumentAdmin } from "@/lib/auth/public-document-admin";
import { auditLog } from "@/lib/audit/store";
import { getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { publicDocuments, publicDocumentVersions } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const admin = await requirePublicDocumentAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { action?: string } | null;
  if (!body || !["publish", "archive", "restore"].includes(body.action ?? "")) return NextResponse.json({ error: "action must be publish, archive, or restore" }, { status: 400 });
  const action = body.action as "publish" | "archive" | "restore";
  let changed = false;
  try { changed = await withRlsContext({ userId: admin.userId, platformAdmin: true, mfaVerified: true }, async () => {
    const db = getDb();
    const [row] = await db.select().from(publicDocuments).where(eq(publicDocuments.id, id)).limit(1);
    if (!row) return false;
    const [version] = await db.select().from(publicDocumentVersions).where(and(eq(publicDocumentVersions.documentId, id), eq(publicDocumentVersions.version, row.currentVersion))).limit(1);
    if (!version) return false;
    if (action === "publish") {
      const payload = version.payload;
      if (payload.kind === "file" && (!payload.redistributionPermission || payload.scanStatus !== "clean")) throw new Error("A hosted file needs recorded redistribution rights and a clean malware scan before publication");
      if (payload.kind === "policy" && !payload.humanApproved) throw new Error("Legal text needs human approval before publication");
      if (row.hostWidePolicy && (payload.kind !== "policy" || row.brandPresetId)) throw new Error("Host-wide policies cannot be union brand variants");
    }
    const now = new Date();
    const effectiveAt = version.payload.effectiveAt ? new Date(version.payload.effectiveAt) : now;
    const publishAt = new Date(Math.max(now.getTime(), effectiveAt.getTime()));
    const values = action === "publish" ? { status: publishAt > now ? "scheduled" as const : "published" as const, publishedVersion: publishAt > now ? row.publishedVersion : row.currentVersion, scheduledVersion: publishAt > now ? row.currentVersion : null, archivedAt: null, publishAt, updatedById: admin.userId, updatedAt: now }
      : action === "archive" ? { status: "archived" as const, archivedAt: now, updatedById: admin.userId, updatedAt: now }
      : { status: "draft" as const, publishedVersion: null, scheduledVersion: null, archivedAt: null, publishAt: null, updatedById: admin.userId, updatedAt: now };
    await db.update(publicDocuments).set(values).where(eq(publicDocuments.id, id));
    await auditLog.log({ userId: admin.userId, action: `site_admin.public_document.${action}`, resourceType: "public_document", resourceId: id, metadata: { slug: row.slug, version: row.currentVersion } });
    return true;
  }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update publication status" }, { status: 400 }); }
  if (!changed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, action }, { headers: { "Cache-Control": "private, no-store" } });
}
