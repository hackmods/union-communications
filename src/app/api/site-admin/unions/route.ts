import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import {
  createUnionDurable,
  hydrateTenantOverlayFromPostgres,
} from "@/lib/tenant/persist";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  localNumber: z.string().min(1).max(32).optional(),
  localSubText: z.string().max(200).optional(),
});

/**
 * POST /api/site-admin/unions — create a union (+ optional first local).
 */
export async function POST(req: Request) {
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

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(createSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  try {
    const seed = await createUnionDurable({
      name: parsed.data.name.trim(),
      localNumber: parsed.data.localNumber?.trim(),
      localSubText: parsed.data.localSubText,
    });
    await hydrateTenantOverlayFromPostgres();
    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.union.create",
      resourceType: "site_admin",
      resourceId: seed.union.id,
      unionId: seed.union.id,
      metadata: {
        name: seed.union.name,
        firstLocalId: seed.locals?.[0]?.id ?? "",
      },
    });
    const firstLocal = seed.locals?.[0];
    return NextResponse.json({
      ok: true,
      union: { id: seed.union.id, name: seed.union.name, slug: seed.union.slug },
      local: firstLocal
        ? {
            id: firstLocal.id,
            localNumber: firstLocal.localNumber,
          }
        : null,
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/unions");
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Create union failed",
      },
      { status: 500 },
    );
  }
}
