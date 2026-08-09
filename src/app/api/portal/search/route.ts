import { NextResponse } from "next/server";
import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalStore } from "@/lib/portal/memory-adapter";

export async function GET(request: Request) {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const hits = portalStore.search(
    session.user.unionId!,
    session.user.id,
    q,
  );
  return NextResponse.json({ hits });
}
