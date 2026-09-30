import {
  getPresidentRoleToolsPatch,
  setPresidentRoleToolsPatch,
} from "@/lib/tenant/overlay";
import {
  DEFAULT_PRESIDENT_ROLE_TOOLS,
  resolvePresidentRoleTools,
  type PresidentRoleToolId,
} from "@/lib/president/module-catalog";

/** Resolve president role-tool nav flags for a union (patch or defaults). */
export function getPresidentRoleToolsForUnion(
  unionId: string,
): PresidentRoleToolId[] {
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
