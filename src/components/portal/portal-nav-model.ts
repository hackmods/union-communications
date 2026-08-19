/**
 * Local Portal chrome IA — Together (`/portal`) is home; Circles live in a dropdown;
 * Dispatch / Hold the line (`/portal/fronts`) / Sidebars / feedback stay top-level.
 */

import type { CircleKind } from "@/types/portal";

export type PortalNavLinkId =
  | "station"
  | "dispatch"
  | "fronts"
  | "sidebars"
  | "feedback";

export type PortalNavLink = {
  id: PortalNavLinkId;
  href: string;
  labelKey:
    | "stationTitle"
    | "dispatchLink"
    | "frontsLink"
    | "sidebarsLink"
    | "sendFeedbackLink";
};

export const PORTAL_NAV_LINKS: readonly PortalNavLink[] = [
  { id: "station", href: "/portal", labelKey: "stationTitle" },
  { id: "dispatch", href: "/portal/dispatch", labelKey: "dispatchLink" },
  { id: "fronts", href: "/portal/fronts", labelKey: "frontsLink" },
  { id: "sidebars", href: "/portal/sidebars", labelKey: "sidebarsLink" },
  {
    id: "feedback",
    href: "/portal/send-feedback",
    labelKey: "sendFeedbackLink",
  },
] as const;

/** Together is exact-match so every `/portal/*` child does not light it up. */
export function portalNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function portalCirclesMenuActive(pathname: string): boolean {
  return pathname.startsWith("/portal/circles/");
}

export function circleIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/portal\/circles\/([^/]+)/);
  return match?.[1] ?? null;
}

/** Dispatch kinds map onto Circle tool tabs so a ping opens the right surface. */
export function circleTabForDispatchKind(
  kind:
    | "mention"
    | "assignment"
    | "due_soon"
    | "bulletin"
    | "roll_call"
    | "pipeline",
): "bulletin" | "actions" | "rollCall" | "pipeline" {
  switch (kind) {
    case "assignment":
    case "due_soon":
      return "actions";
    case "roll_call":
      return "rollCall";
    case "pipeline":
      return "pipeline";
    default:
      return "bulletin";
  }
}

export function circleHrefForDispatch(
  circleId: string,
  kind: Parameters<typeof circleTabForDispatchKind>[0],
): string {
  return `/portal/circles/${circleId}?tab=${circleTabForDispatchKind(kind)}`;
}

export const CIRCLE_CORE_TABS = [
  "bulletin",
  "actions",
  "calendar",
  "binder",
  "floor",
  "roster",
] as const;

export type CircleWorkspaceTab =
  | (typeof CIRCLE_CORE_TABS)[number]
  | "rollCall"
  | "pipeline"
  | "momentum"
  | "oversight";

/**
 * Hall keeps the core local tools. Roll Call, Many hands, and One fight only
 * appear when that Circle already has them. Oversight stays on non-Hall
 * Circles so committees can still see the Action picture.
 */
export function circleWorkspaceTabs(input: {
  kind: CircleKind;
  hasRollCall: boolean;
  hasPipeline: boolean;
  hasMomentum: boolean;
}): CircleWorkspaceTab[] {
  const tabs: CircleWorkspaceTab[] = [...CIRCLE_CORE_TABS];
  const roster = tabs.pop()!;
  if (input.hasRollCall) tabs.push("rollCall");
  if (input.hasPipeline) tabs.push("pipeline");
  if (input.hasMomentum) tabs.push("momentum");
  if (input.kind !== "local_hall") tabs.push("oversight");
  tabs.push(roster);
  return tabs;
}

export type PortalNavCircle = {
  id: string;
  name: string;
  starred: boolean;
};

export function sortCirclesForNav(
  circles: readonly PortalNavCircle[],
): PortalNavCircle[] {
  return [...circles].sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
