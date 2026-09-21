import { NextResponse } from "next/server";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { requireDataAccess } from "@/lib/data-workbench/access";
import { parsePage } from "@/lib/data-workbench/pagination";
import { listPeople } from "@/lib/data-workbench/service";

export async function GET(request: Request) {
  const access = await requireDataAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const url = new URL(request.url);
  const page = parsePage(url.searchParams);
  const result = await withRlsContext((await rlsContextForSession(access.session)) ?? {}, () => listPeople(access, page));
  return NextResponse.json(result);
}
