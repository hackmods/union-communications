import { NextResponse } from "next/server";
import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalStore } from "@/lib/portal/memory-adapter";
import { canCreateCircle } from "@/lib/portal/access";
import { hydrateLocalHall } from "@/lib/portal/hall-roster";
import { getLocalById } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import type { UserRole } from "@/types/tenant";

export async function GET() {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  await hydrateTenantOverlayFromPostgres();
  const unionId = session.user.unionId!;
  const localId = session.user.localId;
  if (localId) {
    const roles = (session.user.roles ?? []) as UserRole[];
    const local = getLocalById(unionId, localId);
    await hydrateLocalHall({
      unionId,
      localId,
      localNumber: local?.localNumber,
      currentUser: {
        userId: session.user.id,
        userName: session.user.name ?? "Member",
        admin: canCreateCircle(roles),
      },
    });
  }
  const station = portalStore.listStation(unionId, session.user.id);
  return NextResponse.json({ station });
}
