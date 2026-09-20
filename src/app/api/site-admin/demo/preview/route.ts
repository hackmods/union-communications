import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  users,
  unions,
  divisions,
  locals,
} from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";

/**
 * GET /api/site-admin/demo/preview
 *
 * Returns counts and examples of any row in the canonical tenant/user
 * tables that is flagged `is_demo = true` (backfilled in
 * `0036_verified_boot_reconcile.sql`). Read-only — destructive purge is
 * `POST /api/site-admin/demo/purge` (typed confirm + password re-auth) or
 * `npm run db:demo-purge`.
 */
export async function GET() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const db = getDb();

  const [userCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.isDemo, true));
  const [unionCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(unions)
    .where(eq(unions.isDemo, true));
  const [divisionCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(divisions)
    .where(eq(divisions.isDemo, true));
  const [localCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(locals)
    .where(eq(locals.isDemo, true));

  await auditLog.log({
    userId: gate.session.user.id,
    action: "site_admin.demo.preview_purge",
    resourceType: "site_admin",
    resourceId: "demo.preview",
    metadata: {
      userCount: String(userCount?.n ?? 0),
      unionCount: String(unionCount?.n ?? 0),
      divisionCount: String(divisionCount?.n ?? 0),
      localCount: String(localCount?.n ?? 0),
    },
  });

  return NextResponse.json({
    counts: {
      users: userCount?.n ?? 0,
      unions: unionCount?.n ?? 0,
      divisions: divisionCount?.n ?? 0,
      locals: localCount?.n ?? 0,
    },
    hint:
      "Purge via POST /api/site-admin/demo/purge (typed `DELETE demo` + password) or `npm run db:demo-purge`. The `is_demo` registry is the durable source.",
  });
}
