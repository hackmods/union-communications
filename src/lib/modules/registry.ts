import type { HubModule } from "@/types/tenant";
import type { UserRole } from "@/types/tenant";
import type { EmojiId } from "@/lib/constants/emoji";

export interface HubModuleDefinition {
  id: HubModule;
  nameKey: string;
  descriptionKey: string;
  href: string;
  emojiId: EmojiId;
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
    emojiId: "megaphone",
    enabledCheck: (m) => m.includes("comms"),
  },
  {
    id: "grievance",
    nameKey: "grievance",
    descriptionKey: "grievanceDesc",
    href: "/app/grievances",
    emojiId: "clipboard",
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
    emojiId: "document",
    requiredRoles: [
      "local_president",
      "stability_member",
      "union_admin",
      "division_admin",
    ],
    requiresMfa: true,
    enabledCheck: (m) => m.includes("bumping"),
  },
  {
    id: "time",
    nameKey: "time",
    descriptionKey: "timeDesc",
    href: "/app/time",
    emojiId: "clock",
    requiredRoles: [
      "local_president",
      "local_steward",
      "local_exec",
      "union_admin",
      "division_admin",
      "solo_account",
    ],
    requiresMfa: true,
    enabledCheck: (m) => m.includes("time"),
  },
  {
    id: "discussions",
    nameKey: "discussions",
    descriptionKey: "discussionsDesc",
    href: "/app/discussions",
    emojiId: "chat",
    requiredRoles: [
      "platform_admin",
      "local_president",
      "local_steward",
      "local_exec",
      "union_admin",
      "division_admin",
      "stability_member",
      "solo_account",
    ],
    requiresMfa: true,
    enabledCheck: (m) => m.includes("discussions"),
  },
  {
    id: "tasks",
    nameKey: "tasks",
    descriptionKey: "tasksDesc",
    href: "/app/tasks",
    emojiId: "clipboard",
    requiredRoles: [
      "platform_admin",
      "union_admin",
      "division_admin",
      "local_president",
      "local_steward",
      "local_exec",
      "stability_member",
      "solo_account",
    ],
    requiresMfa: true,
    enabledCheck: (m) => m.includes("tasks"),
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
