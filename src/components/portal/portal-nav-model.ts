/**
 * Local Portal chrome IA — Station is home; Circles live in a dropdown;
 * Dispatch / Fronts / Sidebars / feedback stay top-level like Hub modules.
 */

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

/** Station is exact-match so every `/portal/*` child does not light it up. */
export function portalNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function portalCirclesMenuActive(pathname: string): boolean {
  return pathname.startsWith("/portal/circles/");
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
