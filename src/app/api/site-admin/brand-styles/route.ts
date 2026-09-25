import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { unions } from "@/lib/db/schema/tenant";
import { isTrustedUnionPresetId } from "@/lib/brand/union-preset-bridge";
import {
  parseUnionBrandTheme,
  unionBrandThemeSchema,
} from "@/lib/brand/union-brand-theme";
import { isCustomizationPublishAvailable } from "@/lib/brand/brand-baseline-from-styles";
import { UNION_PRESETS } from "@/lib/constants/unionPresets";
import {
  hydrateTenantOverlayFromPostgres,
  setUnionBrandTheme,
  setUnionCommsPresetId,
  updateUnionSlug,
} from "@/lib/tenant/persist";
import { getAllTenantSeeds } from "@/lib/tenant/loader";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import { asc } from "drizzle-orm";
import { CANVAS_FONT_ORDER, CANVAS_BODY_FONT_ORDER } from "@/lib/comms/canvas-fonts";

const patchSchema = z.object({
  unionId: z.string().min(1).max(120),
  slug: z.string().min(1).max(64).optional(),
  commsPresetId: z.union([z.string().min(1).max(64), z.null()]).optional(),
  brandTheme: z.union([unionBrandThemeSchema, z.null()]).optional(),
});

/**
 * GET /api/site-admin/brand-styles
 * List unions with slug, Comms preset, and optional theme.
 */
export async function GET() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const presets = UNION_PRESETS.map((p) => ({ id: p.id, name: p.name }));
  const fonts = {
    headline: [...CANVAS_FONT_ORDER],
    body: [...CANVAS_BODY_FONT_ORDER],
  };

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
          brandTheme: unions.brandTheme,
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
          brandTheme: parseUnionBrandTheme(r.brandTheme),
          isDemo: r.isDemo,
        })),
        presets,
        fonts,
        customizationAvailable: isCustomizationPublishAvailable(),
      });
    }

    const seeds = getAllTenantSeeds();
    return NextResponse.json({
      unions: seeds.map((s) => ({
        id: s.union.id,
        name: s.union.name,
        slug: s.union.slug,
        commsPresetId: s.brandDefaults.commsPresetId ?? null,
        brandTheme: parseUnionBrandTheme(s.brandDefaults.brandTheme),
        isDemo: false,
      })),
      presets,
      fonts,
      customizationAvailable: isCustomizationPublishAvailable(),
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/brand-styles");
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}

/**
 * PATCH /api/site-admin/brand-styles
 * Update slug, Comms preset, and/or theme for a union.
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

  const { unionId, slug, commsPresetId, brandTheme } = parsed.data;
  if (
    slug === undefined &&
    commsPresetId === undefined &&
    brandTheme === undefined
  ) {
    return NextResponse.json(
      { error: "Provide slug, commsPresetId, and/or brandTheme" },
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

    let nextTheme = brandTheme;
    if (brandTheme !== undefined) {
      const result = await setUnionBrandTheme(unionId, brandTheme);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }
      nextTheme =
        brandTheme === null ? null : parseUnionBrandTheme(brandTheme);
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
        ...(brandTheme !== undefined
          ? { brandTheme: brandTheme ? "set" : "cleared" }
          : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      unionId,
      ...(nextSlug ? { slug: nextSlug } : {}),
      ...(commsPresetId !== undefined ? { commsPresetId } : {}),
      ...(brandTheme !== undefined ? { brandTheme: nextTheme } : {}),
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/brand-styles");
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
