import { NextResponse } from "next/server";
import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalStore } from "@/lib/portal/memory-adapter";

export async function GET() {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const fronts = portalStore.listFronts(
    session.user.unionId!,
    session.user.id,
  );
  return NextResponse.json({ fronts });
}
