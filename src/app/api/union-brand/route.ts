import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUnionAdminSession } from "@/lib/auth/union-admin-session";
import { auditLog } from "@/lib/audit/store";
import { isTrustedUnionPresetId } from "@/lib/brand/union-preset-bridge";
import { parseUnionBrandTheme, unionBrandThemeSchema } from "@/lib/brand/union-brand-theme";
import { CANVAS_BODY_FONT_ORDER, CANVAS_FONT_ORDER } from "@/lib/comms/canvas-fonts";
import { UNION_PRESETS } from "@/lib/constants/unionPresets";
import { getTenantContext } from "@/lib/tenant/loader";
import {
  hydrateTenantOverlayFromPostgres,
  setUnionBrandTheme,
  setUnionCommsPresetId,
} from "@/lib/tenant/persist";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const patchSchema = z.object({
  commsPresetId: z.string().min(1).max(64).nullable().optional(),
  brandTheme: unionBrandThemeSchema.nullable().optional(),
}).strict();

export async function GET() {
  const gate = await requireUnionAdminSession();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    await hydrateTenantOverlayFromPostgres();
    const tenant = getTenantContext(gate.unionId);
    if (!tenant) return NextResponse.json({ error: "Union not found" }, { status: 404 });
    return NextResponse.json({
      union: {
        name: tenant.union.name,
        commsPresetId: tenant.brandDefaults.commsPresetId ?? null,
        brandTheme: parseUnionBrandTheme(tenant.brandDefaults.brandTheme),
      },
      presets: UNION_PRESETS.map((preset) => ({ id: preset.id, name: preset.name })),
      fonts: { headline: [...CANVAS_FONT_ORDER], body: [...CANVAS_BODY_FONT_ORDER] },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    reportApiFailure(error, "/api/union-brand");
    return NextResponse.json({ error: "Brand styles unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const gate = await requireUnionAdminSession();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(patchSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.issues }, { status: 400 });
  }
  const { commsPresetId, brandTheme } = parsed.data;
  if (commsPresetId === undefined && brandTheme === undefined) {
    return NextResponse.json({ error: "No changes supplied" }, { status: 400 });
  }
  if (commsPresetId !== undefined && commsPresetId !== null && !isTrustedUnionPresetId(commsPresetId)) {
    return NextResponse.json({ error: "Unknown Comms preset" }, { status: 400 });
  }
  try {
    await hydrateTenantOverlayFromPostgres();
    if (!getTenantContext(gate.unionId)) {
      return NextResponse.json({ error: "Union not found" }, { status: 404 });
    }
    if (commsPresetId !== undefined) {
      const result = await setUnionCommsPresetId(gate.unionId, commsPresetId);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (brandTheme !== undefined) {
      const result = await setUnionBrandTheme(gate.unionId, brandTheme);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    }
    await auditLog.log({
      userId: gate.userId,
      action: "union_brand.update",
      resourceType: "union_brand",
      resourceId: gate.unionId,
      unionId: gate.unionId,
      metadata: {
        ...(commsPresetId !== undefined ? { commsPresetId: commsPresetId ?? "" } : {}),
        ...(brandTheme !== undefined ? { brandTheme: brandTheme ? "set" : "cleared" } : {}),
      },
    });
    const updated = getTenantContext(gate.unionId);
    return NextResponse.json({
      union: {
        name: updated?.union.name ?? "",
        commsPresetId: updated?.brandDefaults.commsPresetId ?? null,
        brandTheme: parseUnionBrandTheme(updated?.brandDefaults.brandTheme),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    reportApiFailure(error, "/api/union-brand");
    return NextResponse.json({ error: "Brand styles update failed" }, { status: 503 });
  }
}
