import { requirePortalSession } from "@/lib/portal/portal-session";
import { getPortalAdapter } from "@/lib/portal/adapter";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { decideCapability } from "@/lib/authorization/model";
import { hydrateLocalHall } from "@/lib/portal/hall-roster";
import { getLocalById, getTenantContext } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { portalJson } from "@/lib/portal/portal-json";
import { canCreateUnionScopedCircle } from "@/lib/portal/circle-create";

export async function GET() {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return portalJson(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session, actor } = authResult;
  await hydrateTenantOverlayFromPostgres();
  const unionId = session.user.unionId!;
  const localId = session.user.localId;
  if (localId) {
    const local = getLocalById(unionId, localId);
    await hydrateLocalHall({
      unionId,
      localId,
      localNumber: local?.localNumber,
      rls: rlsContextForActor(session, actor),
      currentUser: {
        userId: session.user.id,
        userName: session.user.name ?? "Member",
        admin: decideCapability(actor, "circles.admin", { unionId, localId }).allowed,
      },
    });
  }
  const portal = await getPortalAdapter(rlsContextForActor(session, actor));
  const station = await portal.listStation(unionId, session.user.id);
  const tenant = getTenantContext(unionId, localId);
  const visibleDivisions = actor.roles.includes("platform_admin")
    ? tenant?.divisions ?? []
    : tenant?.divisions.filter((division) =>
        tenant.locals.some((local) => local.divisionId === division.id &&
          actor.memberships.some((membership) => membership.unionId === unionId && membership.localId === local.id))) ?? [];
  return portalJson({
    station,
    collectives: visibleDivisions.map((division) => ({ id: division.id, name: division.name })),
    authorization: {
      canCreateCircle: decideCapability(actor, "circles.create", { unionId, localId }).allowed,
      canCreateUnionCircle: canCreateUnionScopedCircle(actor, unionId),
    },
  });
}
