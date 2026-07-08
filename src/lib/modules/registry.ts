import type { HubModule } from "@/types/tenant";
import type { UserRole } from "@/types/tenant";

export interface HubModuleDefinition {
  id: HubModule;
  nameKey: string;
  descriptionKey: string;
  href: string;
  icon: string;
  requiredRoles?: UserRole[];
  requiresMfa?: boolean;
  enabledCheck: (enabledModules: HubModule[]) => boolean;
}

export const MODULE_REGISTRY: HubModuleDefinition[] = [
  {
    id: "comms",
    nameKey: "comms",
    descriptionKey: "commsDesc",
    href: "/",
    icon: "📢",
    enabledCheck: (m) => m.includes("comms"),
  },
  {
    id: "grievance",
    nameKey: "grievance",
    descriptionKey: "grievanceDesc",
    href: "/app/grievances",
    icon: "📋",
    requiredRoles: [
      "local_president",
      "local_steward",
      "local_exec",
      "union_admin",
      "solo_account",
    ],
    requiresMfa: true,
    enabledCheck: (m) => m.includes("grievance"),
  },
  {
    id: "bumping",
    nameKey: "bumping",
    descriptionKey: "bumpingDesc",
    href: "/app/bumping",
    icon: "📄",
    requiredRoles: [
      "local_president",
      "stability_member",
      "union_admin",
      "division_admin",
    ],
    requiresMfa: true,
    enabledCheck: (m) => m.includes("bumping"),
  },
];

export function getVisibleModules(
  enabledModules: HubModule[],
  roles: UserRole[],
): HubModuleDefinition[] {
  return MODULE_REGISTRY.filter((mod) => {
    if (!mod.enabledCheck(enabledModules)) return false;
    if (!mod.requiredRoles) return true;
    return mod.requiredRoles.some((r) => roles.includes(r));
  });
}

export function canAccessModule(
  mod: HubModuleDefinition,
  enabledModules: HubModule[],
  roles: UserRole[],
  mfaVerified: boolean,
): boolean {
  if (!mod.enabledCheck(enabledModules)) return false;
  if (mod.requiredRoles && !mod.requiredRoles.some((r) => roles.includes(r))) {
    return false;
  }
  if (mod.requiresMfa && !mfaVerified) return false;
  return true;
}
