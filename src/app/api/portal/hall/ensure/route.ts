import { NextResponse } from "next/server";
import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalStore } from "@/lib/portal/memory-adapter";
import { canCreateCircle } from "@/lib/portal/access";
import { getLocalById } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import type { UserRole } from "@/types/tenant";

/** Ensure this session's local has a Hall and the current user is on the roster. */
export async function POST() {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const localId = session.user.localId;
  if (!localId) {
    return NextResponse.json({ error: "Missing local context" }, { status: 400 });
  }
  await hydrateTenantOverlayFromPostgres();
  const unionId = session.user.unionId!;
  const roles = (session.user.roles ?? []) as UserRole[];
  const local = getLocalById(unionId, localId);
  const { circle } = portalStore.ensureHallAndJoin({
    unionId,
    localId,
    localNumber: local?.localNumber,
    userId: session.user.id,
    userName: session.user.name ?? "Member",
    admin: canCreateCircle(roles),
  });
  return NextResponse.json({ circle });
}
