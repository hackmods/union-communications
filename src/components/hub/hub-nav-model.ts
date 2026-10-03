/**
 * Officer Hub chrome IA — modules stay top-level; everything else groups
 * under Officer tools. Viewport chrome (drawer vs bar) must not drop links.
 */

import type { HubModule, UserRole } from "@/types/tenant";
import {
  canAccessPortal,
  isPortalModuleEnabled,
} from "@/lib/portal/access";

export type HubToolGroupId = "casework" | "records" | "funds" | "admin";

export type HubToolGroupDef = {
  id: HubToolGroupId;
  labelKey:
    | "toolsGroupCasework"
    | "toolsGroupRecords"
    | "toolsGroupFunds"
    | "toolsGroupAdmin";
  hrefs: readonly string[];
};

export const HUB_TOOL_GROUPS: readonly HubToolGroupDef[] = [
  {
    id: "casework",
    labelKey: "toolsGroupCasework",
    hrefs: [
      "/app/calendar",
      "/app/overdue",
      "/app/steward-guides",
      "/app/snippets",
      "/app/marketplace",
      "/app/documents",
      "/app/hybrid",
    ],
  },
  {
    id: "records",
    labelKey: "toolsGroupRecords",
    hrefs: [
      "/app/minutes",
      "/app/officers",
      "/app/committees",
      "/app/elections",
      "/app/meetings",
      "/app/broadcast",
      "/app/polls",
      "/app/officer-learning",
    ],
  },
  {
    id: "funds",
    labelKey: "toolsGroupFunds",
    hrefs: ["/app/ledger"],
  },
  {
    id: "admin",
    labelKey: "toolsGroupAdmin",
    hrefs: [
      "/app/handoff",
      "/app/invites",
      "/app/onboarding",
      "/app/configuration",
      "/app/reports",
      "/app/audit",
      "/app/feedback",
    ],
  },
] as const;

const GROUPED_HREFS = new Set(HUB_TOOL_GROUPS.flatMap((g) => g.hrefs));

export type HubToolLink = { href: string; label: string };

export type HubToolGroup<T extends HubToolLink = HubToolLink> = {
  id: HubToolGroupId | "other";
  labelKey:
    | HubToolGroupDef["labelKey"]
    | "toolsGroupOther";
  links: T[];
};

/** Preserve group order; leftover hrefs stay visible in Other. */
export function groupHubToolLinks<T extends HubToolLink>(
  links: T[],
): HubToolGroup<T>[] {
  const byHref = new Map(links.map((link) => [link.href, link]));
  const groups: HubToolGroup<T>[] = [];

  for (const group of HUB_TOOL_GROUPS) {
    const grouped = group.hrefs
      .map((href) => byHref.get(href))
      .filter((link): link is T => Boolean(link));
    if (grouped.length > 0) {
      groups.push({ id: group.id, labelKey: group.labelKey, links: grouped });
    }
  }

  const leftovers = links.filter((link) => !GROUPED_HREFS.has(link.href));
  if (leftovers.length > 0) {
    groups.push({
      id: "other",
      labelKey: "toolsGroupOther",
      links: leftovers,
    });
  }

  return groups;
}

export function hubToolLinkActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function hubToolsActive(
  pathname: string,
  links: readonly HubToolLink[],
): boolean {
  return links.some((link) => hubToolLinkActive(pathname, link.href));
}

export function hubModuleActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Local Portal stays out of the Hub module strip (it is a workspace peer, not
 * an Officer Hub module). Phone Hub chrome still needs the peer: the public
 * header hides its hamburger on `/app`, and Officer Hub / Local Portal live
 * in the `xl` site nav that phones never see.
 *
 * Site Admin / platform operator chrome is a different gate (`platform_admin`).
 */
export function hubShowsLocalPortalPeer(
  enabledModules: readonly HubModule[] | undefined,
  roles: readonly UserRole[],
): boolean {
  return isPortalModuleEnabled(enabledModules) && canAccessPortal([...roles]);
}
