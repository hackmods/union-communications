import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import { setUserRoles } from "@/lib/site-admin/set-user-roles";
import { parseJsonBody } from "@/lib/validation/parse";
import { userRoleSchema } from "@/lib/validation/tenant";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const bodySchema = z.object({
  roles: z.array(userRoleSchema).min(1).max(12),
});

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/site-admin/users/[id]/roles
 *
 * Replace Hub roles for a user (platform_admin). Bumps sessionVersion.
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

  const { id: targetUserId } = await params;
  if (!targetUserId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
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
    const result = await setUserRoles({
      actorUserId: gate.session.user.id!,
      targetUserId,
      roles: parsed.data.roles,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status },
      );
    }

    await auditLog.log({
      userId: gate.session.user.id!,
      action: "site_admin.user.set_roles",
      resourceType: "site_admin",
      resourceId: targetUserId,
      metadata: {
        roles: result.roles.join(","),
        sessionVersion: String(result.sessionVersion),
      },
    });

    return NextResponse.json({
      roles: result.roles,
      sessionVersion: result.sessionVersion,
    });
  } catch (error) {
    reportApiFailure(error, "PATCH /api/site-admin/users/[id]/roles");
    return NextResponse.json(
      { error: "Could not update roles" },
      { status: 500 },
    );
  }
}
