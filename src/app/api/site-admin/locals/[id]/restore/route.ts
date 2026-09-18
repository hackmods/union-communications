import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { locals } from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * POST /api/site-admin/locals/[id]/restore — counter to `/archive`.
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
      .select({ id: locals.id, unionId: locals.unionId })
      .from(locals)
      .where(eq(locals.id, id))
      .limit(1);
    if (!existing[0]) {
      return NextResponse.json({ error: "Local not found" }, { status: 404 });
    }

    await db
      .update(locals)
      .set({ archivedAt: null, archivedById: null })
      .where(eq(locals.id, id));

    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.local.restore",
      resourceType: "site_admin",
      resourceId: id,
      unionId: existing[0].unionId ?? undefined,
      metadata: { localId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/locals/[id]/restore");
    return NextResponse.json({ error: "Restore failed" }, { status: 500 });
  }
}
