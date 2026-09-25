import { getVisibleModules } from "@/lib/modules/registry";
import { canAccessTasksModule } from "@/lib/tasks/access";
import { canAccessCheckinsModule } from "@/lib/checkins/access";
import { isPlatformOperator } from "@/lib/platform/operator-nav";
import type { HubModule, UserRole } from "@/types/tenant";

/** Dashboard discovery only. API and route policies remain the authority. */
export function resolveDashboardModel(
  roles: UserRole[],
  enabledModules: HubModule[],
  mfaOk: boolean,
) {
  const platformAdmin = isPlatformOperator(roles);
  const isPresident = roles.includes("local_president") && !platformAdmin;
  const showTasks = !platformAdmin && enabledModules.includes("tasks") && canAccessTasksModule(roles);
  const showCheckins = !platformAdmin && enabledModules.includes("checkins") && canAccessCheckinsModule(roles);
  const modules = platformAdmin ? [] : getVisibleModules(enabledModules, roles).filter(
    (mod) => mod.id !== "comms" && mod.id !== "portal",
  );
  const attention = !mfaOk
    ? "locked"
    : platformAdmin
      ? "platform"
      : showTasks || showCheckins
        ? "personal"
        : "modulesOff";

  return { attention, platformAdmin, isPresident, showTasks, showCheckins, modules } as const;
}
