/**
 * Officer Hub chrome IA — modules stay top-level; everything else groups
 * under Officer tools. Viewport chrome (drawer vs bar) must not drop links.
 */

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
      "/app/polls",
      "/app/officer-learning",
    ],
  },
  {
    id: "funds",
    labelKey: "toolsGroupFunds",
    hrefs: ["/app/ledger", "/app/travel", "/app/expenses"],
  },
  {
    id: "admin",
    labelKey: "toolsGroupAdmin",
    hrefs: [
      "/app/handoff",
      "/app/invites",
      "/app/onboarding",
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
