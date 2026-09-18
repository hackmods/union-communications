import { NextResponse } from "next/server";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const MAX_ROWS = 50;

/**
 * GET /api/site-admin/users/search?q=<email-or-name-substring>
 *
 * Cross-tenant operator directory — `platform_admin` only. Substring match
 * runs against `users.email` OR `users.name`; result is bounded to 50 rows.
 * Archived rows and demo roster are filtered out by default; toggle them
 * with `includeArchived=true` / `includeDemo=true`.
 *
 * Audited under `site_admin.user.cross_tenant_read` (break-glass).
 */
export async function GET(request: Request) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const includeArchived =
    url.searchParams.get("includeArchived") === "true";
  const includeDemo = url.searchParams.get("includeDemo") === "true";

  if (!q) {
    return NextResponse.json({ rows: [], total: 0 });
  }

  try {
    const db = getDb();
    const sub = `%${q}%`;

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        roles: users.roles,
        archivedAt: users.archivedAt,
        isDemo: users.isDemo,
      })
      .from(users)
      .where(
        and(
          or(ilike(users.email, sub), ilike(users.name, sub)),
          includeArchived ? undefined : isNull(users.archivedAt),
          includeDemo ? undefined : eq(users.isDemo, false),
        ),
      )
      .limit(MAX_ROWS);

    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.user.cross_tenant_read",
      resourceType: "site_admin",
      resourceId: "users.search",
      metadata: {
        q,
        includeArchived: String(includeArchived),
        includeDemo: String(includeDemo),
        resultCount: String(rows.length),
      },
    });

    return NextResponse.json({ rows, total: rows.length });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/users/search");
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 },
    );
  }
}
