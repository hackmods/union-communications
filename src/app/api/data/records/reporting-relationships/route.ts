import { NextResponse } from "next/server";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { requireDataAccess } from "@/lib/data-workbench/access";
import { parsePage } from "@/lib/data-workbench/pagination";
import { getDirectReports, getReportingChain } from "@/lib/data-workbench/service";

export async function GET(request: Request) {
  const access = await requireDataAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const personId = new URL(request.url).searchParams.get("personId");
  if (!personId) return NextResponse.json({ error: "personId is required." }, { status: 400 });
  const page = parsePage(new URL(request.url).searchParams);
  const rlsContext = await rlsContextForSession(access.session) ?? {};
  const data = await withRlsContext(rlsContext, async () => {
    const [chain, reports] = await Promise.all([
      getReportingChain(access, personId),
      getDirectReports(access, personId, page),
    ]);
    return { chain, directReports: reports.people, directReportsTotal: reports.total, directReportsNextOffset: reports.nextOffset };
  });
  return NextResponse.json(data);
}
