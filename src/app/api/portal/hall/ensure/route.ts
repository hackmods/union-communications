import { requirePortalSession } from "@/lib/portal/portal-session";
import { canCreateCircle } from "@/lib/portal/access";
import { hydrateLocalHall } from "@/lib/portal/hall-roster";
import { getLocalById } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { portalJson } from "@/lib/portal/portal-json";
import type { UserRole } from "@/types/tenant";

/** Ensure this session's local has a Hall and the known roster is joined. */
export async function POST() {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return portalJson(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const localId = session.user.localId;
  if (!localId) {
    return portalJson({ error: "Missing local context" }, { status: 400 });
  }
  await hydrateTenantOverlayFromPostgres();
  const unionId = session.user.unionId!;
  const roles = (session.user.roles ?? []) as UserRole[];
  const local = getLocalById(unionId, localId);
  const { circle } = await hydrateLocalHall({
    unionId,
    localId,
    localNumber: local?.localNumber,
    currentUser: {
      userId: session.user.id,
      userName: session.user.name ?? "Member",
      admin: canCreateCircle(roles),
    },
  });
  return portalJson({ circle });
}
