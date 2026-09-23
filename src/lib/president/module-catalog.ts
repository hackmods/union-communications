/**
 * President Configuration catalog — intelligent defaults that keep Officer Hub
 * executive-focused and Local Portal member-facing, without flooding the nav.
 */

import type { HubModule } from "@/types/tenant";
import type { PortalNavLinkId } from "@/components/portal/portal-nav-model";
import { isWorkforceTimeEnabled } from "@/lib/features/workforce-time";

/** Hub modules pre-enabled for new locals / president soft-launch. */
export const PRESIDENT_HUB_DEFAULT_ON: readonly HubModule[] = [
  "comms",
  "grievance",
  "discussions",
  "bylaws",
  "proposals",
  "portal",
] as const;

/**
 * Granular operational Hub modules kept off until a president opts in.
 * Workforce Time covers clock, sites/geofence, scheduling, and shift tracking.
 */
export const PRESIDENT_HUB_DEFAULT_OFF: readonly HubModule[] = [
  "time",
  "bumping",
  "tasks",
  "informalLog",
  "checkins",
  "data",
] as const;

/** Overlay / create-union defaults — same set as president Hub defaults. */
export const PRESIDENT_OVERLAY_MODULES: HubModule[] = [
  ...PRESIDENT_HUB_DEFAULT_ON,
];

export type HubConfigRow = {
  id: HubModule;
  /** i18n key under hub.presidentConfig.hubModules.* */
  labelKey: string;
  blurbKey: string;
  defaultOn: boolean;
  /** Presidents may toggle; `data` stays union/platform admin only. */
  presidentToggle: boolean;
  tier: "executive" | "operational";
};

export const HUB_CONFIG_ROWS: readonly HubConfigRow[] = [
  {
    id: "grievance",
    labelKey: "grievance",
    blurbKey: "grievanceBlurb",
    defaultOn: true,
    presidentToggle: true,
    tier: "executive",
  },
  {
    id: "discussions",
    labelKey: "discussions",
    blurbKey: "discussionsBlurb",
    defaultOn: true,
    presidentToggle: true,
    tier: "executive",
  },
  {
    id: "bylaws",
    labelKey: "bylaws",
    blurbKey: "bylawsBlurb",
    defaultOn: true,
    presidentToggle: true,
    tier: "executive",
  },
  {
    id: "proposals",
    labelKey: "proposals",
    blurbKey: "proposalsBlurb",
    defaultOn: true,
    presidentToggle: true,
    tier: "executive",
  },
  {
    id: "portal",
    labelKey: "portal",
    blurbKey: "portalBlurb",
    defaultOn: true,
    presidentToggle: true,
    tier: "executive",
  },
  {
    id: "comms",
    labelKey: "comms",
    blurbKey: "commsBlurb",
    defaultOn: true,
    presidentToggle: true,
    tier: "executive",
  },
  {
    id: "time",
    labelKey: "time",
    blurbKey: "timeBlurb",
    defaultOn: false,
    presidentToggle: true,
    tier: "operational",
  },
  {
    id: "bumping",
    labelKey: "bumping",
    blurbKey: "bumpingBlurb",
    defaultOn: false,
    presidentToggle: true,
    tier: "operational",
  },
  {
    id: "tasks",
    labelKey: "tasks",
    blurbKey: "tasksBlurb",
    defaultOn: false,
    presidentToggle: true,
    tier: "operational",
  },
  {
    id: "informalLog",
    labelKey: "informalLog",
    blurbKey: "informalLogBlurb",
    defaultOn: false,
    presidentToggle: true,
    tier: "operational",
  },
  {
    id: "checkins",
    labelKey: "checkins",
    blurbKey: "checkinsBlurb",
    defaultOn: false,
    presidentToggle: true,
    tier: "operational",
  },
  {
    id: "data",
    labelKey: "data",
    blurbKey: "dataBlurb",
    defaultOn: false,
    presidentToggle: false,
    tier: "operational",
  },
] as const;

/**
 * Hub Configuration rows shown to presidents. Workforce Time stays in
 * `HUB_CONFIG_ROWS` / MODULE_REGISTRY for future refactor — this filter only
 * hides discovery when `NEXT_PUBLIC_WORKFORCE_TIME_ENABLED` is off.
 */
export function visibleHubConfigRows(
  env?: Partial<NodeJS.ProcessEnv>,
): HubConfigRow[] {
  return HUB_CONFIG_ROWS.filter((row) => {
    if (row.id === "time" && !isWorkforceTimeEnabled(env)) return false;
    return true;
  });
}

/**
 * Local Portal surfaces — separate from HubModule ids so presidents can shape
 * the member experience without toggling confidential casework.
 */
export type PortalSurfaceId =
  | "announcements"
  | "news"
  | "elections"
  | "discussions"
  | "myCases"
  | "sidebars"
  | "feedback";

export type PortalConfigRow = {
  id: PortalSurfaceId;
  labelKey: string;
  blurbKey: string;
  defaultOn: boolean;
  /** Portal nav link(s) this surface gates. Circles use `discussions`. */
  navLinkIds: readonly PortalNavLinkId[];
  /** Optional Hub module that must also be on (hard gate). */
  requiresHubModule?: HubModule;
};

export const PORTAL_CONFIG_ROWS: readonly PortalConfigRow[] = [
  {
    id: "announcements",
    labelKey: "announcements",
    blurbKey: "announcementsBlurb",
    defaultOn: true,
    navLinkIds: ["dispatch"],
  },
  {
    id: "news",
    labelKey: "news",
    blurbKey: "newsBlurb",
    defaultOn: true,
    navLinkIds: ["fronts"],
  },
  {
    id: "elections",
    labelKey: "elections",
    blurbKey: "electionsBlurb",
    defaultOn: true,
    navLinkIds: ["proposals"],
    requiresHubModule: "proposals",
  },
  {
    id: "discussions",
    labelKey: "discussions",
    blurbKey: "discussionsBlurb",
    defaultOn: true,
    navLinkIds: ["station"],
  },
  {
    id: "myCases",
    labelKey: "myCases",
    blurbKey: "myCasesBlurb",
    defaultOn: true,
    navLinkIds: ["myCases"],
    requiresHubModule: "grievance",
  },
  {
    id: "sidebars",
    labelKey: "sidebars",
    blurbKey: "sidebarsBlurb",
    defaultOn: true,
    navLinkIds: ["sidebars"],
  },
  {
    id: "feedback",
    labelKey: "feedback",
    blurbKey: "feedbackBlurb",
    defaultOn: true,
    navLinkIds: ["feedback"],
  },
] as const;

export const DEFAULT_PORTAL_SURFACES: readonly PortalSurfaceId[] =
  PORTAL_CONFIG_ROWS.filter((row) => row.defaultOn).map((row) => row.id);

/** Officer tools that stay available by role — not HubModule flags. */
export const PRESIDENT_ALWAYS_ON_TOOLS = [
  { id: "financialSummaries", href: "/app/ledger" },
  { id: "invites", href: "/app/invites" },
  { id: "meetings", href: "/app/meetings" },
] as const;

export function isHubModuleDefaultOn(id: HubModule): boolean {
  return (PRESIDENT_HUB_DEFAULT_ON as readonly string[]).includes(id);
}

export function resolvePortalSurfaces(
  enabled: readonly PortalSurfaceId[] | null | undefined,
): PortalSurfaceId[] {
  if (!enabled || enabled.length === 0) return [...DEFAULT_PORTAL_SURFACES];
  const allowed = new Set(PORTAL_CONFIG_ROWS.map((r) => r.id));
  return enabled.filter((id): id is PortalSurfaceId => allowed.has(id));
}

/** Map a portal nav link to its governing surface (station stays when discussions on). */
export function portalNavLinkAllowed(
  linkId: PortalNavLinkId,
  surfaces: readonly PortalSurfaceId[],
  enabledModules: readonly HubModule[],
): boolean {
  const row = PORTAL_CONFIG_ROWS.find((r) => r.navLinkIds.includes(linkId));
  if (!row) return true;
  if (!surfaces.includes(row.id)) return false;
  if (row.requiresHubModule && !enabledModules.includes(row.requiresHubModule)) {
    return false;
  }
  return true;
}

export function applyHubModuleToggle(
  current: readonly HubModule[],
  id: HubModule,
  enabled: boolean,
): HubModule[] {
  const next = new Set(current);
  if (enabled) next.add(id);
  else next.delete(id);
  // Comms stays available for Brand Kit / public tools even if list is empty.
  if (next.size === 0) next.add("comms");
  return [...next];
}

export function applyPortalSurfaceToggle(
  current: readonly PortalSurfaceId[],
  id: PortalSurfaceId,
  enabled: boolean,
): PortalSurfaceId[] {
  const next = new Set(resolvePortalSurfaces(current));
  if (enabled) next.add(id);
  else if (id !== "discussions") next.delete(id);
  // Together / Circles stay on — presidents thin other surfaces first.
  if (!next.has("discussions")) next.add("discussions");
  return [...next];
}

/** Modules that need an explicit confirm before turning off. */
export const DESTRUCTIVE_HUB_MODULES: readonly HubModule[] = [
  "grievance",
  "portal",
] as const;

export function isDestructiveHubOff(
  id: HubModule,
  nextEnabled: boolean,
): boolean {
  return !nextEnabled && (DESTRUCTIVE_HUB_MODULES as readonly string[]).includes(id);
}

export type PresidentPresetId = "calmStart" | "bargainingSeason" | "campaign";

export type PresidentPreset = {
  id: PresidentPresetId;
  modules: HubModule[];
  surfaces: PortalSurfaceId[];
};

export const PRESIDENT_PRESETS: readonly PresidentPreset[] = [
  {
    id: "calmStart",
    modules: [...PRESIDENT_HUB_DEFAULT_ON],
    surfaces: [...DEFAULT_PORTAL_SURFACES],
  },
  {
    id: "bargainingSeason",
    modules: [
      ...PRESIDENT_HUB_DEFAULT_ON,
      "tasks",
      "informalLog",
    ],
    surfaces: [...DEFAULT_PORTAL_SURFACES],
  },
  {
    id: "campaign",
    modules: [
      "comms",
      "grievance",
      "discussions",
      "proposals",
      "portal",
      "checkins",
    ],
    surfaces: [
      "announcements",
      "news",
      "elections",
      "discussions",
      "sidebars",
      "feedback",
    ],
  },
] as const;

export function getPresidentPreset(id: PresidentPresetId): PresidentPreset {
  const preset = PRESIDENT_PRESETS.find((row) => row.id === id);
  if (!preset) return PRESIDENT_PRESETS[0]!;
  return preset;
}

/** Solidarity product names for Portal surfaces (i18n under portalSurfaces.*.product). */
export function portalSurfaceProductKey(id: PortalSurfaceId): string {
  return id;
}

export function sameModuleSet(
  a: readonly HubModule[],
  b: readonly HubModule[],
): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, i) => id === right[i]);
}

export function sameSurfaceSet(
  a: readonly PortalSurfaceId[],
  b: readonly PortalSurfaceId[],
): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, i) => id === right[i]);
}

/** Intersect union-enabled modules with an optional local presentation filter. */
export function resolveLocalHubModules(
  unionModules: readonly HubModule[],
  localFilter: readonly HubModule[] | null | undefined,
): HubModule[] {
  if (!localFilter || localFilter.length === 0) return [...unionModules];
  const allowed = new Set(unionModules);
  const filtered = localFilter.filter((id) => allowed.has(id));
  return filtered.length > 0 ? filtered : [...unionModules];
}

export function resolveLocalPortalSurfaces(
  unionSurfaces: readonly PortalSurfaceId[],
  localFilter: readonly PortalSurfaceId[] | null | undefined,
): PortalSurfaceId[] {
  const base = resolvePortalSurfaces(unionSurfaces);
  if (!localFilter || localFilter.length === 0) return base;
  const allowed = new Set(base);
  const filtered = localFilter.filter((id) => allowed.has(id));
  return filtered.length > 0 ? resolvePortalSurfaces(filtered) : base;
}

