import { NextResponse } from "next/server";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import {
  clearHostBrand,
  hostBrandPatchSchema,
  hydrateHostBrandFromPostgres,
  resolveHostBrandWithOverlay,
  saveHostBrand,
} from "@/lib/brand/host-brand-store";
import { UNION_PRESETS } from "@/lib/constants/unionPresets";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import { z } from "zod";

/**
 * GET /api/site-admin/host-brand
 * Resolved instance host brand (env → durable overlay → file).
 */
export async function GET() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    await hydrateHostBrandFromPostgres();
    const brand = resolveHostBrandWithOverlay();
    return NextResponse.json({
      brand,
      presets: UNION_PRESETS.map((p) => ({ id: p.id, name: p.name })),
      envOverrides: {
        primaryColor: Boolean(process.env.NEXT_PUBLIC_BRAND_PRIMARY?.trim()),
        secondaryColor: Boolean(
          process.env.NEXT_PUBLIC_BRAND_SECONDARY?.trim(),
        ),
        accentColor: Boolean(process.env.NEXT_PUBLIC_BRAND_ACCENT?.trim()),
        localNumber: Boolean(
          process.env.NEXT_PUBLIC_DEFAULT_LOCAL_NUMBER?.trim(),
        ),
        subText: Boolean(process.env.NEXT_PUBLIC_DEFAULT_SUB_TEXT?.trim()),
        unionPresetId: Boolean(
          process.env.NEXT_PUBLIC_BRAND_UNION_PRESET?.trim(),
        ),
      },
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/host-brand");
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}

const patchBody = hostBrandPatchSchema;
const deleteBody = z.object({ clear: z.literal(true) }).strict();

/**
 * PATCH /api/site-admin/host-brand
 * Save durable instance defaults (overridden by NEXT_PUBLIC_BRAND_* when set).
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

  const clearParsed = deleteBody.safeParse(raw);
  if (clearParsed.success) {
    try {
      await clearHostBrand();
      await auditLog.log({
        userId: gate.session.user.id,
        action: "site_admin.host_brand.clear",
        resourceType: "site_admin",
        resourceId: "host-brand",
      });
      return NextResponse.json({
        ok: true,
        brand: resolveHostBrandWithOverlay(),
      });
    } catch (err) {
      reportApiFailure(err, "/api/site-admin/host-brand");
      return NextResponse.json({ error: "Clear failed" }, { status: 500 });
    }
  }

  const parsed = parseJsonBody(patchBody, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  try {
    const brand = await saveHostBrand(parsed.data);
    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.host_brand.update",
      resourceType: "site_admin",
      resourceId: "host-brand",
      metadata: {
        primaryColor: brand.primaryColor,
        unionPresetId: brand.unionPresetId ?? "",
      },
    });
    return NextResponse.json({ ok: true, brand });
  } catch (err) {
    const message =
      err instanceof Error && err.message === "Unknown Comms preset id"
        ? err.message
        : "Update failed";
    if (message !== "Update failed") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    reportApiFailure(err, "/api/site-admin/host-brand");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
