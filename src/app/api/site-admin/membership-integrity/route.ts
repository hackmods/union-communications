import { NextResponse } from "next/server";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import { scanMembershipIntegrity } from "@/lib/site-admin/membership-integrity";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * GET /api/site-admin/membership-integrity
 *
 * Read-only scan of membership / local assignment drift for operators.
 */
export async function GET() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Postgres is not configured", issues: [], highCount: 0 },
      { status: 503 },
    );
  }

  try {
    const result = await scanMembershipIntegrity();
    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.membership_integrity.scan",
      resourceType: "site_admin",
      resourceId: "membership-integrity",
      metadata: {
        issueCount: String(result.issues.length),
        highCount: String(result.highCount),
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/membership-integrity");
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
