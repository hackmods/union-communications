import type { AuthorizationActor } from "@/lib/authorization/model";
import { getPortalAdapter } from "@/lib/portal/adapter";

/** Resolve Circle admin authority from the Portal store, scoped to this actor. */
export async function actorHasActiveCircleAdminAuthority(
  actor: AuthorizationActor,
): Promise<boolean> {
  if (!actor.unionId) return false;
  const portal = await getPortalAdapter({
    unionId: actor.unionId,
    localId: actor.activeLocalId,
    userId: actor.userId,
    mfaVerified: actor.mfaVerified,
  });
  return portal.hasAdminCircleMembership(actor.unionId, actor.userId);
}
