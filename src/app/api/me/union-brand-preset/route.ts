import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolvePresetIdFromUnionId } from "@/lib/brand/union-preset-bridge";
import { parseUnionBrandTheme } from "@/lib/brand/union-brand-theme";
import {
  hydrateTenantOverlayFromPostgres,
} from "@/lib/tenant/persist";
import { getTenantByUnionId } from "@/lib/tenant/loader";
import { isPostgresConfigured } from "@/lib/db/client";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * GET /api/me/union-brand-preset
 * Resolve Comms preset + optional theme for the signed-in user's Hub union.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (isPostgresConfigured()) {
      await hydrateTenantOverlayFromPostgres();
    }
    const unionId = session.user.unionId;
    const presetId = resolvePresetIdFromUnionId(unionId);
    const seed = unionId ? getTenantByUnionId(unionId) : undefined;
    const theme = seed
      ? parseUnionBrandTheme(seed.brandDefaults.brandTheme)
      : null;
    return NextResponse.json({
      presetId,
      theme,
      unionId: unionId ?? null,
    });
  } catch (err) {
    reportApiFailure(err, "/api/me/union-brand-preset");
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
