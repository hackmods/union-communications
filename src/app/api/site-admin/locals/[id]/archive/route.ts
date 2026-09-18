import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { locals } from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * POST /api/site-admin/locals/[id]/archive
 *
 * Soft-archive a local: set `archived_at = now()`, record `archived_by_id`
 * from the operator session. Restoring (POST to `/restore`) clears both
 * fields. Both actions emit `site_admin.local.archive` /
 * `site_admin.local.restore` under the `site_admin` resource type.
 *
 * Hard delete (cascade to bargaining_units + downstream casework) ships
 * in v2 with a typed-confirm UI — v1 forbids any IRREVERSIBLE delete here
 * because the cascade is non-trivial and we have no UX for it yet.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing local id" }, { status: 400 });
  }

  try {
    const db = getDb();
    const existing = await db
      .select({
        id: locals.id,
        archivedAt: locals.archivedAt,
        unionId: locals.unionId,
      })
      .from(locals)
      .where(eq(locals.id, id))
      .limit(1);
    if (!existing[0]) {
      return NextResponse.json({ error: "Local not found" }, { status: 404 });
    }

    const now = new Date();
    await db
      .update(locals)
      .set({ archivedAt: now, archivedById: gate.session.user.id })
      .where(eq(locals.id, id));

    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.local.archive",
      resourceType: "site_admin",
      resourceId: id,
      unionId: existing[0].unionId ?? undefined,
      metadata: { localId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/locals/[id]/archive");
    return NextResponse.json({ error: "Archive failed" }, { status: 500 });
  }
}
