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
  const items = portalStore.listDispatch(
    session.user.unionId!,
    session.user.id,
  );
  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const body = (await request.json()) as { ids?: string[]; all?: boolean };
  const n = portalStore.markDispatchRead(
    session.user.unionId!,
    session.user.id,
    body.all ? undefined : body.ids,
  );
  return NextResponse.json({ marked: n });
}
