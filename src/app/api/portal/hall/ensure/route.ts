import { requirePortalSession } from "@/lib/portal/portal-session";
import { decideCapability } from "@/lib/authorization/model";
import { hydrateLocalHall } from "@/lib/portal/hall-roster";
import { getLocalById } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { portalJson } from "@/lib/portal/portal-json";
import { rlsContextForActor } from "@/lib/auth/rls-scope";

/** Ensure this session's local has a Hall and the known roster is joined. */
export async function POST() {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return portalJson(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session, actor } = authResult;
  const localId = session.user.localId;
  if (!localId) {
    return portalJson({ error: "Missing local context" }, { status: 400 });
  }
  await hydrateTenantOverlayFromPostgres();
  const unionId = session.user.unionId!;
  const local = getLocalById(unionId, localId);
  const { circle } = await hydrateLocalHall({
    unionId,
    localId,
    localNumber: local?.localNumber,
    rls: rlsContextForActor(session, actor),
    currentUser: {
      userId: session.user.id,
      userName: session.user.name ?? "Member",
      admin: decideCapability(actor, "circles.admin", { unionId: session.user.unionId, localId: session.user.localId }).allowed,
    },
  });
  return portalJson({ circle });
}
