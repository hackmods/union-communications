import { NextResponse } from "next/server";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { requireDataAccess } from "@/lib/data-workbench/access";
import { parsePage } from "@/lib/data-workbench/pagination";
import { getPersonHistory } from "@/lib/data-workbench/service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireDataAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const page = parsePage(new URL(request.url).searchParams);
  const history = await withRlsContext((await rlsContextForSession(access.session)) ?? {}, () => getPersonHistory(access, id, page));
  return history ? NextResponse.json({ history }) : NextResponse.json({ error: "Person not found." }, { status: 404 });
}
