import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { unions } from "@/lib/db/schema/tenant";
import { isTrustedUnionPresetId } from "@/lib/brand/union-preset-bridge";
import { UNION_PRESETS } from "@/lib/constants/unionPresets";
import {
  hydrateTenantOverlayFromPostgres,
  setUnionCommsPresetId,
  updateUnionSlug,
} from "@/lib/tenant/persist";
import { getAllTenantSeeds } from "@/lib/tenant/loader";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import { asc } from "drizzle-orm";

const patchSchema = z.object({
  unionId: z.string().min(1).max(120),
  slug: z.string().min(1).max(64).optional(),
  commsPresetId: z.union([z.string().min(1).max(64), z.null()]).optional(),
});

/**
 * GET /api/site-admin/brand-styles
 * List unions with slug + bound Comms preset (Postgres when configured).
 */
export async function GET() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const presets = UNION_PRESETS.map((p) => ({ id: p.id, name: p.name }));

  try {
    if (isPostgresConfigured()) {
      await hydrateTenantOverlayFromPostgres();
      const db = getDb();
      const rows = await db
        .select({
          id: unions.id,
          name: unions.name,
          slug: unions.slug,
          commsPresetId: unions.commsPresetId,
          isDemo: unions.isDemo,
        })
        .from(unions)
        .orderBy(asc(unions.name));
      return NextResponse.json({
        unions: rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          commsPresetId: r.commsPresetId ?? null,
          isDemo: r.isDemo,
        })),
        presets,
      });
    }

    const seeds = getAllTenantSeeds();
    return NextResponse.json({
      unions: seeds.map((s) => ({
        id: s.union.id,
        name: s.union.name,
        slug: s.union.slug,
        commsPresetId: s.brandDefaults.commsPresetId ?? null,
        isDemo: false,
      })),
      presets,
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/brand-styles");
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}

/**
 * PATCH /api/site-admin/brand-styles
 * Update slug and/or Comms preset binding for a union.
 */
export async function PATCH(req: Request) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(patchSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const { unionId, slug, commsPresetId } = parsed.data;
  if (slug === undefined && commsPresetId === undefined) {
    return NextResponse.json(
      { error: "Provide slug and/or commsPresetId" },
      { status: 400 },
    );
  }
  if (
    commsPresetId !== undefined &&
    commsPresetId !== null &&
    !isTrustedUnionPresetId(commsPresetId)
  ) {
    return NextResponse.json(
      { error: "Unknown Comms preset id" },
      { status: 400 },
    );
  }

  try {
    let nextSlug: string | undefined;
    if (slug !== undefined) {
      const result = await updateUnionSlug(unionId, slug);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }
      nextSlug = result.slug;
    }

    if (commsPresetId !== undefined) {
      const result = await setUnionCommsPresetId(unionId, commsPresetId);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }
    }

    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.brand_styles.update",
      resourceType: "site_admin",
      resourceId: unionId,
      unionId,
      metadata: {
        ...(nextSlug ? { slug: nextSlug } : {}),
        ...(commsPresetId !== undefined
          ? { commsPresetId: commsPresetId ?? "" }
          : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      unionId,
      ...(nextSlug ? { slug: nextSlug } : {}),
      ...(commsPresetId !== undefined ? { commsPresetId } : {}),
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/brand-styles");
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
