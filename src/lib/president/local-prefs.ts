/**
 * Local presentation prefs — filter Hub/Portal chrome for one local without
 * changing union-wide enabledModules (API hard gates stay on the union list).
 */

import type { HubModule } from "@/types/tenant";
import type { PortalSurfaceId } from "@/lib/president/module-catalog";
import {
  resolveLocalHubModules,
  resolveLocalPortalSurfaces,
  resolvePortalSurfaces,
} from "@/lib/president/module-catalog";

export type LocalPresentationPrefs = {
  hubModules: HubModule[];
  portalSurfaces: PortalSurfaceId[];
};

const localPrefs = new Map<string, LocalPresentationPrefs>();

function key(unionId: string, localId: string): string {
  return `${unionId}::${localId}`;
}

export function getLocalPresentationPrefs(
  unionId: string,
  localId: string | null | undefined,
): LocalPresentationPrefs | null {
  if (!localId) return null;
  return localPrefs.get(key(unionId, localId)) ?? null;
}

export function setLocalPresentationPrefs(
  unionId: string,
  localId: string,
  prefs: LocalPresentationPrefs,
): LocalPresentationPrefs {
  const next: LocalPresentationPrefs = {
    hubModules: [...new Set(prefs.hubModules)],
    portalSurfaces: resolvePortalSurfaces(prefs.portalSurfaces),
  };
  localPrefs.set(key(unionId, localId), next);
  return next;
}

export function clearLocalPresentationPrefs(
  unionId: string,
  localId: string,
): void {
  localPrefs.delete(key(unionId, localId));
}

export function resolveHubModulesForLocal(
  unionId: string,
  localId: string | null | undefined,
  unionModules: readonly HubModule[],
): HubModule[] {
  const prefs = getLocalPresentationPrefs(unionId, localId);
  return resolveLocalHubModules(unionModules, prefs?.hubModules);
}

export function resolvePortalSurfacesForLocal(
  unionId: string,
  localId: string | null | undefined,
  unionSurfaces: readonly PortalSurfaceId[],
): PortalSurfaceId[] {
  const prefs = getLocalPresentationPrefs(unionId, localId);
  return resolveLocalPortalSurfaces(unionSurfaces, prefs?.portalSurfaces);
}

/** @internal test helper */
export function resetLocalPresentationPrefsForTests(): void {
  localPrefs.clear();
}
