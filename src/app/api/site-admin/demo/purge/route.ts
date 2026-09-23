import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import {
  getOwnerDb,
  isOwnerDbConfigured,
} from "@/lib/db/owner-client";
import { users } from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyPassword } from "@/lib/auth/password";
import { auditLog } from "@/lib/audit/store";
import { isDemoPurgeEnabled } from "@/lib/features/demo-purge";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import {
  DEMO_PURGE_CONFIRM_PHRASE,
  assertDemoPurgeConfirm,
  countDemoRows,
  formatDemoPurgeCounts,
  purgeDemoRows,
  totalDemoCount,
} from "@/lib/site-admin/demo-purge";

/**
 * POST /api/site-admin/demo/purge
 *
 * Body: `{ "confirm": "DELETE demo", "password": "<actor password>" }`
 *
 * Typed confirmation + password re-auth. Uses MIGRATE_DATABASE_URL for the
 * destructive transaction so RLS cannot leave restrict orphans.
 * Requires `SITE_ADMIN_DEMO_PURGE_ENABLED=true` on the host.
 */
export async function POST(req: Request) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (!isDemoPurgeEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Postgres is not configured" },
      { status: 503 },
    );
  }
  if (!isOwnerDbConfigured()) {
    return NextResponse.json(
      {
        error:
          "MIGRATE_DATABASE_URL is required on this host to purge demo rows",
      },
      { status: 503 },
    );
  }

  let body: { confirm?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { confirm?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const confirm =
    typeof body.confirm === "string" ? body.confirm : "";
  const password =
    typeof body.password === "string" ? body.password : "";

  try {
    assertDemoPurgeConfirm(confirm);
  } catch {
    return NextResponse.json(
      {
        error: `Confirmation phrase mismatch — type exactly "${DEMO_PURGE_CONFIRM_PHRASE}"`,
      },
      { status: 400 },
    );
  }

  if (!password) {
    return NextResponse.json(
      { error: "Password re-authentication is required" },
      { status: 400 },
    );
  }

  try {
    const runtimeDb = getDb();
    const actorRows = await runtimeDb
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
        isDemo: users.isDemo,
      })
      .from(users)
      .where(eq(users.id, gate.session.user.id))
      .limit(1);
    const actor = actorRows[0];
    if (!actor) {
      return NextResponse.json(
        { error: "Operator account not found in Postgres users table" },
        { status: 403 },
      );
    }
    if (actor.isDemo) {
      return NextResponse.json(
        { error: "Refusing to purge: operator account is flagged is_demo" },
        { status: 403 },
      );
    }
    const passwordOk = await verifyPassword(password, actor.passwordHash);
    if (!passwordOk) {
      await auditLog.log({
        userId: gate.session.user.id,
        action: "site_admin.demo.purge_denied",
        resourceType: "site_admin",
        resourceId: "demo.purge",
        metadata: { reason: "bad_password" },
      });
      return NextResponse.json(
        { error: "Password re-authentication failed" },
        { status: 403 },
      );
    }

    const countsBefore = await countDemoRows(runtimeDb);
    if (totalDemoCount(countsBefore) === 0) {
      return NextResponse.json({
        ok: true,
        deleted: countsBefore,
        message: "Nothing to delete",
      });
    }

    const result = await purgeDemoRows(getOwnerDb(), {
      actorUserId: gate.session.user.id,
    });

    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.demo.purge",
      resourceType: "site_admin",
      resourceId: "demo.purge",
      metadata: {
        counts: formatDemoPurgeCounts(result.deleted),
        caseworkStatements: String(result.caseworkStatements),
      },
    });

    return NextResponse.json({
      ok: true,
      deleted: result.deleted,
      caseworkStatements: result.caseworkStatements,
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/demo/purge");
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Demo purge failed",
      },
      { status: 500 },
    );
  }
}
