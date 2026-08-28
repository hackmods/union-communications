/**
 * Single source of truth for public `/guide/*` discoverability groups.
 * Pages map registry keys to their own i18n namespaces — hrefs stay canonical here.
 */

export type GuideTier = "gold" | "playbook" | "channel";

export type GuideGroupId =
  | "commsPath"
  | "channels"
  | "bargaining"
  | "labour";

export type GuideRegistryEntry = {
  href: string;
  key: string;
  tier: GuideTier;
  /** Steward playbooks hub — featured Officer Learning row */
  featured?: boolean;
  /** `resources.path.links.*` when it differs from `key` */
  resourcesCommsKey?: string;
  /** `resources.labourPath.links.*` when it differs from `key` */
  resourcesLabourKey?: string;
};

/** Hub route — not listed inside a discoverability group */
export const GUIDE_HUB_PATH = "/guide";

export const GUIDE_STEWARD_PLAYBOOKS_HUB = "/guide/steward-playbooks";

/** Ordered discoverability groups (matches `/guide` bottom strips + Resources sections). */
export const GUIDE_REGISTRY: Record<GuideGroupId, readonly GuideRegistryEntry[]> =
  {
    commsPath: [
      { href: "/guide/social-media-plan", key: "plan", tier: "gold" },
      { href: "/guide", key: "blueprint", tier: "playbook" },
      { href: "/guide/resources", key: "resources", tier: "gold" },
      { href: "/guide/workshop", key: "workshop", tier: "gold" },
      { href: "/guide/photo-consent", key: "photoConsent", tier: "playbook" },
    ],
    channels: [
      {
        href: "/guide/union-boards",
        key: "unionBoards",
        tier: "gold",
        resourcesCommsKey: "boards",
      },
      { href: "/guide/print", key: "print", tier: "channel" },
      { href: "/guide/website", key: "website", tier: "gold" },
      { href: "/guide/email-broadcast", key: "email", tier: "channel" },
      { href: "/guide/short-form", key: "shortForm", tier: "gold" },
      { href: "/guide/membership-signup", key: "membershipSignup", tier: "gold" },
    ],
    bargaining: [
      { href: "/guide/bargaining", key: "bargaining", tier: "playbook" },
      { href: "/guide/crisis", key: "crisis", tier: "playbook" },
    ],
    labour: [
      {
        href: GUIDE_STEWARD_PLAYBOOKS_HUB,
        key: "stewardPlaybooks",
        tier: "playbook",
      },
      { href: "/guide/steward-101", key: "steward101", tier: "playbook" },
      {
        href: "/guide/officer-learning",
        key: "officerLearning",
        tier: "gold",
        featured: true,
      },
      { href: "/guide/grievance-process", key: "grievance", tier: "playbook" },
      { href: "/guide/dfr", key: "dfr", tier: "playbook" },
      { href: "/guide/seniority-bumping", key: "seniority", tier: "playbook" },
      {
        href: "/guide/right-to-refuse",
        key: "rightToRefuse",
        tier: "playbook",
      },
      {
        href: "/guide/joint-committee",
        key: "jointCommittee",
        tier: "playbook",
      },
      {
        href: "/guide/workplace-mapping",
        key: "workplaceMapping",
        tier: "playbook",
      },
      { href: "/guide/bylaws", key: "bylaws", tier: "playbook" },
      {
        href: "/guide/running-meetings",
        key: "runningMeetings",
        tier: "playbook",
      },
    ],
  };

/** Flat list for Blueprint `relatedLinks` (legacy path strip). */
export const GUIDE_BLUEPRINT_PATH_LINKS: readonly GuideRegistryEntry[] = [
  { href: "/guide/social-media-plan", key: "plan", tier: "gold" },
  { href: "/guide/resources", key: "resources", tier: "gold" },
  { href: "/guide/crisis", key: "crisis", tier: "playbook" },
  { href: "/guide/steward-101", key: "steward101", tier: "playbook" },
  { href: "/guide/officer-learning", key: "officerLearning", tier: "gold" },
  { href: "/guide/grievance-process", key: "grievance", tier: "playbook" },
  { href: "/guide/dfr", key: "dfr", tier: "playbook" },
  { href: "/guide/seniority-bumping", key: "seniority", tier: "playbook" },
  {
    href: "/guide/right-to-refuse",
    key: "rightToRefuse",
    tier: "playbook",
  },
  { href: "/guide/joint-committee", key: "jointCommittee", tier: "playbook" },
  {
    href: "/guide/workplace-mapping",
    key: "workplaceMapping",
    tier: "playbook",
  },
  { href: "/guide/bylaws", key: "bylaws", tier: "playbook" },
  {
    href: "/guide/running-meetings",
    key: "runningMeetings",
    tier: "playbook",
  },
];

/** Resources page — comms path grid (`resources.path.*`). */
export const GUIDE_RESOURCES_COMMS_LINKS: readonly {
  href: string;
  key: string;
}[] = [
  { href: "/guide", key: "blueprint" },
  { href: "/guide/social-media-plan", key: "plan" },
  { href: "/guide/workshop", key: "workshop" },
  { href: "/guide/union-boards", key: "boards" },
  { href: "/guide/print", key: "print" },
  { href: "/guide/website", key: "website" },
  { href: "/guide/email-broadcast", key: "email" },
  { href: "/guide/short-form", key: "shortForm" },
  { href: "/guide/crisis", key: "crisis" },
  { href: "/guide/photo-consent", key: "photoConsent" },
];

/** Resources page — labour path grid (`resources.labourPath.*`). */
export const GUIDE_RESOURCES_LABOUR_LINKS: readonly {
  href: string;
  key: string;
}[] = [
  { href: GUIDE_STEWARD_PLAYBOOKS_HUB, key: "stewardPlaybooks" },
  { href: "/guide/steward-101", key: "steward101" },
  { href: "/guide/officer-learning", key: "officerLearning" },
  { href: "/guide/grievance-process", key: "grievance" },
  { href: "/guide/dfr", key: "dfr" },
  { href: "/guide/seniority-bumping", key: "seniority" },
  { href: "/guide/right-to-refuse", key: "rightToRefuse" },
  { href: "/guide/joint-committee", key: "jointCommittee" },
  { href: "/guide/bargaining", key: "bargaining" },
  { href: "/guide/workplace-mapping", key: "workplaceMapping" },
  { href: "/guide/bylaws", key: "bylaws" },
  { href: "/guide/running-meetings", key: "runningMeetings" },
];

/**
 * Steward playbooks hub — floor playbooks plus bargaining and membership
 * (membership primary group is `channels`; bargaining is `bargaining`).
 */
export const GUIDE_STEWARD_PLAYBOOK_LINKS: readonly GuideRegistryEntry[] = [
  { href: "/guide/steward-101", key: "steward101", tier: "playbook" },
  {
    href: "/guide/officer-learning",
    key: "officerLearning",
    tier: "gold",
    featured: true,
  },
  { href: "/guide/grievance-process", key: "grievance", tier: "playbook" },
  { href: "/guide/dfr", key: "dfr", tier: "playbook" },
  {
    href: "/guide/workplace-mapping",
    key: "workplaceMapping",
    tier: "playbook",
  },
  { href: "/guide/membership-signup", key: "membershipSignup", tier: "gold" },
  {
    href: "/guide/right-to-refuse",
    key: "rightToRefuse",
    tier: "playbook",
  },
  { href: "/guide/seniority-bumping", key: "seniority", tier: "playbook" },
  {
    href: "/guide/joint-committee",
    key: "jointCommittee",
    tier: "playbook",
  },
  { href: "/guide/bargaining", key: "bargaining", tier: "playbook" },
  { href: "/guide/bylaws", key: "bylaws", tier: "playbook" },
  {
    href: "/guide/running-meetings",
    key: "runningMeetings",
    tier: "playbook",
  },
];

/** Primary group for each registered path — used by coverage tests. */
export function primaryGuideGroupForPath(href: string): GuideGroupId | undefined {
  for (const [groupId, entries] of Object.entries(GUIDE_REGISTRY) as [
    GuideGroupId,
    readonly GuideRegistryEntry[],
  ][]) {
    if (entries.some((entry) => entry.href === href)) return groupId;
  }
  return undefined;
}

export function allRegisteredGuidePaths(): string[] {
  const paths = new Set<string>();
  for (const group of Object.values(GUIDE_REGISTRY)) {
    for (const entry of group) {
      paths.add(entry.href);
    }
  }
  for (const entry of GUIDE_BLUEPRINT_PATH_LINKS) {
    paths.add(entry.href);
  }
  return [...paths].sort();
}

/** Every `/guide/*` path in PUBLIC_PATHS must appear in the registry (hub + officer-learning modules exempt). */
export function guidePathsMissingFromRegistry(publicGuidePaths: string[]): string[] {
  const registered = new Set(allRegisteredGuidePaths());
  registered.add(GUIDE_HUB_PATH);
  return publicGuidePaths.filter((path) => !registered.has(path));
}
