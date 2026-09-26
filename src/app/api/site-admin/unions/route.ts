import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import {
  createUnionDurable,
  hydrateTenantOverlayFromPostgres,
  setUnionCommsPresetId,
} from "@/lib/tenant/persist";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import { isTrustedUnionPresetId } from "@/lib/brand/union-preset-bridge";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(64).optional(),
  localNumber: z.string().min(1).max(32).optional(),
  localSubText: z.string().max(200).optional(),
  commsPresetId: z.string().min(1).max(64).optional(),
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
    if (
      parsed.data.commsPresetId &&
      !isTrustedUnionPresetId(parsed.data.commsPresetId)
    ) {
      return NextResponse.json(
        { error: "Unknown Comms preset id" },
        { status: 400 },
      );
    }

    const seed = await createUnionDurable({
      name: parsed.data.name.trim(),
      slug: parsed.data.slug?.trim(),
      localNumber: parsed.data.localNumber?.trim(),
      localSubText: parsed.data.localSubText,
    });
    if (parsed.data.commsPresetId) {
      await setUnionCommsPresetId(seed.union.id, parsed.data.commsPresetId);
    }
    await hydrateTenantOverlayFromPostgres();
    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.union.create",
      resourceType: "site_admin",
      resourceId: seed.union.id,
      unionId: seed.union.id,
      metadata: {
        name: seed.union.name,
        slug: seed.union.slug,
        firstLocalId: seed.locals?.[0]?.id ?? "",
        ...(parsed.data.commsPresetId
          ? { commsPresetId: parsed.data.commsPresetId }
          : {}),
      },
    });
    const firstLocal = seed.locals?.[0];
    return NextResponse.json({
      ok: true,
      union: {
        id: seed.union.id,
        name: seed.union.name,
        slug: seed.union.slug,
        commsPresetId: parsed.data.commsPresetId ?? null,
      },
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
