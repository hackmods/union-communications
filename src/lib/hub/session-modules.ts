import type { Session } from "next-auth";
import { getTenantContext } from "@/lib/tenant/loader";
import type { HubModule } from "@/types/tenant";

/** Enabled Hub modules for the session union (empty when tenant unknown). */
export function getSessionEnabledModules(session: Session): HubModule[] {
  if (!session.user.unionId) return [];
  const tenant = getTenantContext(session.user.unionId, session.user.localId);
  return tenant?.union.enabledModules ?? [];
}

export function isSessionModuleEnabled(
  session: Session,
  moduleId: HubModule,
): boolean {
  return getSessionEnabledModules(session).includes(moduleId);
}
