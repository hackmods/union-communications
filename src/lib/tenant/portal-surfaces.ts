import {
  getPortalSurfacesPatch,
  setPortalSurfacesPatch,
} from "@/lib/tenant/overlay";
import {
  DEFAULT_PORTAL_SURFACES,
  resolvePortalSurfaces,
  type PortalSurfaceId,
} from "@/lib/president/module-catalog";

/** Resolve portal surfaces for a union (patch or intelligent defaults). */
export function getPortalSurfacesForUnion(unionId: string): PortalSurfaceId[] {
  return resolvePortalSurfaces(getPortalSurfacesPatch(unionId));
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
