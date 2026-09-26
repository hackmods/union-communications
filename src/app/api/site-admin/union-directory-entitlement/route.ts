import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import { setPaidTenantDirectory } from "@/lib/tenant/paid-directory";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const bodySchema = z.object({
  unionId: z.string().min(1).max(120),
  enabled: z.boolean(),
}).strict();

/** Operator-only, audited grant/revocation. Never accepts a user-supplied scope. */
export async function PATCH(request: Request) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Durable database required" }, { status: 503 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(bodySchema, raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.issues }, { status: 400 });
  }
  const { unionId, enabled } = parsed.data;
  try {
    if (!(await setPaidTenantDirectory(unionId, enabled))) {
      return NextResponse.json({ error: "Union not found" }, { status: 404 });
    }
    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.union_directory_entitlement.update",
      resourceType: "site_admin",
      resourceId: unionId,
      unionId,
      metadata: { enabled: String(enabled) },
    });
    return NextResponse.json({ unionId, enabled }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    reportApiFailure(error, "/api/site-admin/union-directory-entitlement");
    return NextResponse.json({ error: "Entitlement update failed" }, { status: 503 });
  }
}
