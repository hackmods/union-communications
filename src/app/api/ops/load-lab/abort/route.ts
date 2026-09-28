import { NextResponse } from "next/server";
import { abortLoadLabRun } from "@/lib/ops/load-lab";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/** POST /api/ops/load-lab/abort — stop the in-flight run. */
export async function POST() {
  try {
    const gate = await requireSiteAdminSession();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }
    const result = await abortLoadLabRun();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.status, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    reportApiFailure(err, "/api/ops/load-lab/abort");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
