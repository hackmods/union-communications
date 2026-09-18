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
 * tables that is flagged `is_demo = true` by the data migration
 * `0001_site_admin_backfill.sql`. Read-only — no purge action is offered
 * from the UI in v1 (purge lands in v2 with a typed-confirm action).
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
      "Purge ships in v2. The `is_demo` registry is the durable source — any row flagged here was set by the 0001 data migration or by direct insert.",
  });
}
