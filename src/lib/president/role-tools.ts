import {
  getEnabledModulesPatch,
  getPresidentRoleToolsPatch,
  setEnabledModulesPatch,
  setPresidentRoleToolsPatch,
} from "@/lib/tenant/overlay";
import { getTenantContext } from "@/lib/tenant/loader";
import {
  DEFAULT_PRESIDENT_ROLE_TOOLS,
  LEGACY_ROLE_TOOL_HUB_MODULES,
  resolvePresidentRoleTools,
  type PresidentRoleToolId,
} from "@/lib/president/module-catalog";
import type { HubModule } from "@/types/tenant";

const LEGACY_SET = new Set<string>(LEGACY_ROLE_TOOL_HUB_MODULES);

/**
 * One-time map: president role-tool prefs for expenses/travel → enabledModules.
 * Strips legacy ids from the role-tool patch so nav no longer keys off them.
 */
export function migrateLegacyRoleToolsToHubModules(unionId: string): void {
  const raw = getPresidentRoleToolsPatch(unionId);
  if (!raw?.length) return;
  const legacy = raw.filter((id) => LEGACY_SET.has(id)) as HubModule[];
  if (legacy.length === 0) return;

  const existingPatch = getEnabledModulesPatch(unionId);
  const tenantModules = getTenantContext(unionId)?.union.enabledModules ?? [];
  const base = existingPatch ?? tenantModules;
  const nextModules = [...new Set([...base, ...legacy])];
  setEnabledModulesPatch(unionId, nextModules);

  const cleaned = raw.filter((id) => !LEGACY_SET.has(id)) as PresidentRoleToolId[];
  setPresidentRoleToolsPatch(unionId, resolvePresidentRoleTools(cleaned));
}

/** Resolve president role-tool nav flags for a union (patch or defaults). */
export function getPresidentRoleToolsForUnion(
  unionId: string,
): PresidentRoleToolId[] {
  migrateLegacyRoleToolsToHubModules(unionId);
  return resolvePresidentRoleTools(getPresidentRoleToolsPatch(unionId));
}

export function setPresidentRoleToolsForUnion(
  unionId: string,
  tools: PresidentRoleToolId[],
): PresidentRoleToolId[] {
  const next = resolvePresidentRoleTools(tools);
  if (next.length === 0 && DEFAULT_PRESIDENT_ROLE_TOOLS.length === 0) {
    setPresidentRoleToolsPatch(unionId, []);
    return [];
  }
  setPresidentRoleToolsPatch(unionId, next);
  return next;
}
