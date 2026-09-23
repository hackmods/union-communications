import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import {
  createCollectionDurable,
  findOrCreateLocal,
} from "@/lib/tenant/persist";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const bodySchema = z.object({
  unionId: z.string().min(1),
  localNumber: z.string().min(1).max(32),
  localSubText: z.string().max(200).optional(),
  collectionCode: z.string().min(1).max(32).optional(),
  collectionName: z.string().min(1).max(200).optional(),
  divisionId: z.string().optional(),
});

/**
 * POST /api/site-admin/locals
 *
 * Create (or find) a local under a union. platform_admin only.
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
  const parsed = parseJsonBody(bodySchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  try {
    const { local, created } = await findOrCreateLocal({
      unionId: parsed.data.unionId,
      localNumber: parsed.data.localNumber,
      subText: parsed.data.localSubText,
      divisionId: parsed.data.divisionId,
    });

    let collectionId: string | undefined;
    if (parsed.data.collectionCode && parsed.data.collectionName) {
      const unit = await createCollectionDurable({
        unionId: parsed.data.unionId,
        localId: local.id,
        code: parsed.data.collectionCode,
        name: parsed.data.collectionName,
      });
      collectionId = unit.id;
    }

    await auditLog.log({
      userId: gate.session.user.id,
      action: created
        ? "site_admin.local.create"
        : "site_admin.local.find_existing",
      resourceType: "site_admin",
      resourceId: local.id,
      unionId: parsed.data.unionId,
      localId: local.id,
      metadata: {
        localNumber: local.localNumber,
        created: String(created),
        ...(collectionId ? { collectionId } : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      local: {
        id: local.id,
        localNumber: local.localNumber,
        subText: local.subText,
        unionId: local.unionId,
      },
      created,
      collectionId,
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/locals");
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Create local failed",
      },
      { status: 500 },
    );
  }
}
