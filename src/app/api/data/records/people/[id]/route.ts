import { NextResponse } from "next/server";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { requireDataAccess } from "@/lib/data-workbench/access";
import { getPersonProfile } from "@/lib/data-workbench/service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireDataAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const asOf = new URL(request.url).searchParams.get("asOf") ?? undefined;
  const rlsContext = await rlsContextForSession(access.session) ?? {};
  const profile = await withRlsContext(rlsContext, () => getPersonProfile(access, id, asOf));
  return profile
    ? NextResponse.json({ profile })
    : NextResponse.json({ error: "Person not found." }, { status: 404 });
}
