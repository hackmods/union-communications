import { NextResponse } from "next/server";
import {
  hydrateHostBrandFromPostgres,
  resolveHostBrandWithOverlay,
} from "@/lib/brand/host-brand-store";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * GET /api/host-brand
 * Public resolved instance defaults for first-visit Brand Kit chrome.
 * No secrets — colours / local number / optional preset only.
 */
export async function GET() {
  try {
    await hydrateHostBrandFromPostgres();
    const brand = resolveHostBrandWithOverlay();
    return NextResponse.json({
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      accentColor: brand.accentColor,
      localNumber: brand.localNumber,
      subText: brand.subText,
      ...(brand.divisionId ? { divisionId: brand.divisionId } : {}),
      ...(brand.unionPresetId ? { unionPresetId: brand.unionPresetId } : {}),
    });
  } catch (err) {
    reportApiFailure(err, "/api/host-brand");
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
