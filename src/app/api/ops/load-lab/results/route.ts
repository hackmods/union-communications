import { NextResponse } from "next/server";
import {
  getLoadLabStatus,
  importLoadLabSummary,
  parseSummaryJson,
} from "@/lib/ops/load-lab";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * GET /api/ops/load-lab/results — latest summary from live state.
 * POST /api/ops/load-lab/results — import a summary.json body into live state.
 */
export async function GET() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const status = getLoadLabStatus();
  if (!status.summary) {
    return NextResponse.json(
      { error: "No summary available yet." },
      { status: 404 },
    );
  }
  return NextResponse.json(status.summary, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(req: Request) {
  try {
    const gate = await requireSiteAdminSession();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }
    const json = await req.json().catch(() => null);
    const parsed = parseSummaryJson(json);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid Load Lab summary.json (schemaVersion 1 required)." },
        { status: 400 },
      );
    }
    importLoadLabSummary(parsed);
    return NextResponse.json(parsed, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    reportApiFailure(err, "/api/ops/load-lab/results");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
