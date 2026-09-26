import { NextResponse } from "next/server";
import { requireUnionAdminSession } from "@/lib/auth/union-admin-session";
import { isPostgresConfigured } from "@/lib/db/client";
import {
  hasPaidTenantDirectory,
  listPaidTenantDirectory,
} from "@/lib/tenant/paid-directory";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/** Union-local metadata only. No member, committee, or casework content. */
export async function GET() {
  const gate = await requireUnionAdminSession();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const unionId = gate.unionId;
  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Durable directory unavailable" }, { status: 503 });
  }
  try {
    if (!(await hasPaidTenantDirectory(unionId))) {
      return NextResponse.json({ error: "Paid directory access required" }, { status: 403 });
    }
    const locals = await listPaidTenantDirectory(unionId, gate.userId);
    return NextResponse.json({ unionId, locals }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    reportApiFailure(error, "/api/union-directory");
    return NextResponse.json({ error: "Directory unavailable" }, { status: 503 });
  }
}
