import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { isPostgresConfigured } from "@/lib/db/client";
import {
  hasPaidTenantDirectory,
  listPaidTenantDirectory,
} from "@/lib/tenant/paid-directory";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/** Union-local metadata only. No member, committee, or casework content. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }
  const unionId = session.user.unionId;
  if (!unionId || !session.user.roles?.includes("union_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Durable directory unavailable" }, { status: 503 });
  }
  try {
    if (!(await hasPaidTenantDirectory(unionId))) {
      return NextResponse.json({ error: "Paid directory access required" }, { status: 403 });
    }
    const locals = await listPaidTenantDirectory(unionId, session.user.id);
    return NextResponse.json({ unionId, locals }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    reportApiFailure(error, "/api/union-directory");
    return NextResponse.json({ error: "Directory unavailable" }, { status: 503 });
  }
}
