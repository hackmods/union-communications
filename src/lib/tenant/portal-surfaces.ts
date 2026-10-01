import {
  getPortalSurfacesPatch,
  getUnionHostedPlanPatch,
  getLocalHostedPlanPatch,
  setPortalSurfacesPatch,
} from "@/lib/tenant/overlay";
import {
  DEFAULT_PORTAL_SURFACES,
  resolvePortalSurfaces,
  type PortalSurfaceId,
} from "@/lib/president/module-catalog";
import {
  UNSET_HOSTED_PLAN,
  isHostedPlansEnabled,
  resolveEffectivePortalSurfaces,
} from "@/lib/tenant/hosted-plans";

/** Resolve portal surfaces for a union (patch or intelligent defaults), then plan caps. */
export function getPortalSurfacesForUnion(
  unionId: string,
  localId?: string | null,
): PortalSurfaceId[] {
  const base = resolvePortalSurfaces(getPortalSurfacesPatch(unionId));
  if (!isHostedPlansEnabled()) return base;
  return resolveEffectivePortalSurfaces({
    unionSurfaces: base,
    unionPlan: getUnionHostedPlanPatch(unionId) ?? UNSET_HOSTED_PLAN,
    localPlan: localId
      ? (getLocalHostedPlanPatch(localId) ?? UNSET_HOSTED_PLAN)
      : UNSET_HOSTED_PLAN,
    enforcementEnabled: true,
  });
}

export function setPortalSurfacesForUnion(
  unionId: string,
  surfaces: PortalSurfaceId[],
): PortalSurfaceId[] {
  const next = resolvePortalSurfaces(surfaces);
  if (next.length === 0) {
    setPortalSurfacesPatch(unionId, [...DEFAULT_PORTAL_SURFACES]);
    return [...DEFAULT_PORTAL_SURFACES];
  }
  setPortalSurfacesPatch(unionId, next);
  return next;
}
