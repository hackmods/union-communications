import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { updateUnionMembershipPolicy } from "@/lib/tenant/assign-local";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const bodySchema = z.object({
  membershipPolicy: z.enum(["multi_local", "single_local"]),
});

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/site-admin/unions/[id]
 *
 * Update union membership policy (platform_admin).
 * When switching to single_local, returns how many members already have
 * multiple active locals so the UI can warn.
 */
export async function PATCH(req: Request, { params }: Params) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Postgres is not configured" },
      { status: 503 },
    );
  }

  const { id: unionId } = await params;
  if (!unionId) {
    return NextResponse.json({ error: "Missing union id" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(bodySchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  try {
    let multiLocalMemberCount = 0;
    if (parsed.data.membershipPolicy === "single_local") {
      const db = getDb();
      const result = await db.execute(sql`
        SELECT count(*)::int AS n FROM (
          SELECT user_id
          FROM local_memberships
          WHERE union_id = ${unionId}
            AND status = 'active'
            AND ended_at IS NULL
          GROUP BY user_id
          HAVING count(*) > 1
        ) AS multi
      `);
      const rows = Array.isArray(result)
        ? (result as Array<{ n: number }>)
        : ((result as { rows?: Array<{ n: number }> }).rows ?? []);
      multiLocalMemberCount = Number(rows[0]?.n ?? 0);
    }

    const result = await updateUnionMembershipPolicy(
      unionId,
      parsed.data.membershipPolicy,
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.union.membership_policy",
      resourceType: "site_admin",
      resourceId: unionId,
      unionId,
      metadata: {
        membershipPolicy: parsed.data.membershipPolicy,
        multiLocalMemberCount: String(multiLocalMemberCount),
      },
    });

    return NextResponse.json({
      ok: true,
      membershipPolicy: parsed.data.membershipPolicy,
      multiLocalMemberCount,
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/unions/[id]");
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 },
    );
  }
}
