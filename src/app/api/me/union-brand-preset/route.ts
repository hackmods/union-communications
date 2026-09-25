import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolvePresetIdFromUnionId } from "@/lib/brand/union-preset-bridge";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { isPostgresConfigured } from "@/lib/db/client";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * GET /api/me/union-brand-preset
 * Resolve Comms preset for the signed-in user's Hub union (one-way bridge).
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
    const presetId = resolvePresetIdFromUnionId(session.user.unionId);
    return NextResponse.json({
      presetId,
      unionId: session.user.unionId ?? null,
    });
  } catch (err) {
    reportApiFailure(err, "/api/me/union-brand-preset");
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
