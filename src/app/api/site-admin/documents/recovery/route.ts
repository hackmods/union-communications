import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isMfaEnabled } from "@/lib/auth/mfa-policy";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";

export async function POST(request: Request) {
  const admin = await requireSiteAdminSession();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  if (!isMfaEnabled()) {
    return NextResponse.json(
      { error: "Enable host MFA before recovery", code: "mfa_disabled" },
      { status: 503 },
    );
  }
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Recovery requires Postgres" }, { status: 503 });
  const body = await request.json().catch(() => null) as { documentId?: string; reason?: string } | null;
  const documentId = body?.documentId?.trim();
  const reason = body?.reason?.trim();
  if (!documentId || documentId.length > 200 || !reason || reason.length < 20 || reason.length > 2000) return NextResponse.json({ error: "Provide one exact document ID and a reason of 20 to 2,000 characters" }, { status: 400 });
  const result = await withRlsContext({ userId: admin.session.user.id, platformAdmin: true, mfaVerified: true }, () => getDb().execute(sql`SELECT * FROM app_restore_archived_document(${documentId})`));
  const restored = result[0] as { union_id: string; local_id: string } | undefined;
  if (!restored) return NextResponse.json({ error: "Archived document not found" }, { status: 404 });
  await withRlsContext({ userId: admin.session.user.id, unionId: restored.union_id, localId: restored.local_id, platformAdmin: true, mfaVerified: true }, () => auditLog.log({ userId: admin.session.user.id, action: "site_admin.document.recover", resourceType: "document", resourceId: documentId, unionId: restored.union_id, localId: restored.local_id, metadata: { reason } }));
  return NextResponse.json({ ok: true, documentId }, { headers: { "Cache-Control": "private, no-store" } });
}
