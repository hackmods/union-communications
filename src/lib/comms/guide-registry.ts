/**
 * Single source of truth for public `/guide/*` discoverability groups.
 * Pages map registry keys to their own i18n namespaces — hrefs stay canonical here.
 * Nav and `/guides` catalog derive job groups from this file — do not recopy href arrays.
 */

export type GuideTier = "gold" | "playbook" | "channel";

export type GuideGroupId =
  | "commsPath"
  | "channels"
  | "bargaining"
  | "labour";

/** Steward job groups — nav Floor/Local column + playbooks hub sections. */
export type GuideJobGroupId = "training" | "floor" | "local" | "campaign";

export const GUIDE_JOB_GROUP_IDS = [
  "training",
  "floor",
  "local",
  "campaign",
] as const satisfies readonly GuideJobGroupId[];

export type GuideRegistryEntry = {
  href: string;
  key: string;
  tier: GuideTier;
  /** `nav` message key — set on GUIDE_REGISTRY rows */
  navKey?: string;
  /** Steward playbooks hub — featured Officer Learning row */
  featured?: boolean;
  /** `resources.path.links.*` when it differs from `key` */
  resourcesCommsKey?: string;
  /** `resources.labourPath.links.*` when it differs from `key` */
  resourcesLabourKey?: string;
};

/** Hub route — not listed inside a discoverability group */
export const GUIDE_HUB_PATH = "/guide";

/** Honest All-guides catalog (parallel to `/tools`). Blueprint stays `/guide`. */
export const GUIDE_CATALOG_PATH = "/guides";

export const GUIDE_STEWARD_PLAYBOOKS_HUB = "/guide/steward-playbooks";

/** Ordered discoverability groups (matches `/guide` bottom strips + Resources sections). */
export const GUIDE_REGISTRY: Record<GuideGroupId, readonly GuideRegistryEntry[]> =
  {
    commsPath: [
      {
        href: "/guide/social-media-plan",
        key: "plan",
        tier: "gold",
        navKey: "firstWeek",
      },
      { href: "/guide", key: "blueprint", tier: "playbook", navKey: "guide" },
      {
        href: "/guide/resources",
        key: "resources",
        tier: "gold",
        navKey: "resources",
      },
      {
        href: "/guide/workshop",
        key: "workshop",
        tier: "gold",
        navKey: "workshopGuide",
      },
      {
        href: "/guide/photo-consent",
        key: "photoConsent",
        tier: "playbook",
        navKey: "photoConsent",
      },
    ],
    channels: [
      {
        href: "/guide/union-boards",
        key: "unionBoards",
        tier: "gold",
        navKey: "unionBoardsGuide",
        resourcesCommsKey: "boards",
      },
      {
        href: "/guide/print",
        key: "print",
        tier: "channel",
        navKey: "printGuide",
      },
      {
        href: "/guide/website",
        key: "website",
        tier: "gold",
        navKey: "websiteGuide",
      },
      {
        href: "/guide/email-broadcast",
        key: "email",
        tier: "channel",
        navKey: "emailBroadcastGuide",
      },
      {
        href: "/guide/short-form",
        key: "shortForm",
        tier: "gold",
        navKey: "shortFormGuide",
      },
      {
        href: "/guide/membership-signup",
        key: "membershipSignup",
        tier: "gold",
        navKey: "membershipSignupGuide",
      },
    ],
    bargaining: [
      {
        href: "/guide/bargaining",
        key: "bargaining",
        tier: "playbook",
        navKey: "bargainingGuide",
      },
      {
        href: "/guide/strike",
        key: "strike",
        tier: "playbook",
        navKey: "strikeOpsGuide",
      },
      {
        href: "/guide/crisis",
        key: "crisis",
        tier: "playbook",
        navKey: "crisisCommsGuide",
      },
    ],
    labour: [
      {
        href: "/guide/officer-learning",
        key: "officerLearning",
        tier: "gold",
        navKey: "officerLearningGuide",
        featured: true,
      },
      {
        href: GUIDE_STEWARD_PLAYBOOKS_HUB,
        key: "stewardPlaybooks",
        tier: "playbook",
        navKey: "stewardPlaybooksHub",
      },
      {
        href: "/guide/steward-101",
        key: "steward101",
        tier: "playbook",
        navKey: "steward101Guide",
      },
      {
        href: "/guide/union-history",
        key: "unionHistory",
        tier: "gold",
        navKey: "unionHistoryGuide",
      },
      {
        href: "/guide/grievance-process",
        key: "grievance",
        tier: "playbook",
        navKey: "grievanceProcessGuide",
      },
      { href: "/guide/dfr", key: "dfr", tier: "playbook", navKey: "dfrGuide" },
      {
        href: "/guide/seniority-bumping",
        key: "seniority",
        tier: "playbook",
        navKey: "seniorityGuide",
      },
      {
        href: "/guide/right-to-refuse",
        key: "rightToRefuse",
        tier: "playbook",
        navKey: "rightToRefuseGuide",
      },
      {
        href: "/guide/joint-committee",
        key: "jointCommittee",
        tier: "playbook",
        navKey: "jointCommitteeGuide",
      },
      {
        href: "/guide/workplace-mapping",
        key: "workplaceMapping",
        tier: "playbook",
        navKey: "workplaceMappingGuide",
      },
      {
        href: "/guide/bylaws",
        key: "bylaws",
        tier: "playbook",
        navKey: "bylawsGuide",
      },
      {
        href: "/guide/running-meetings",
        key: "runningMeetings",
        tier: "playbook",
        navKey: "runningMeetingsGuide",
      },
      {
        href: "/guide/land-acknowledgement",
        key: "landAcknowledgement",
        tier: "playbook",
        navKey: "landAcknowledgementGuide",
      },
    ],
  };

export function registryEntryByHref(href: string): GuideRegistryEntry | undefined {
  for (const group of Object.values(GUIDE_REGISTRY)) {
    const found = group.find((entry) => entry.href === href);
    if (found) return found;
  }
  return undefined;
}

function registryEntries(hrefs: readonly string[]): GuideRegistryEntry[] {
  return hrefs.map((href) => {
    const entry = registryEntryByHref(href);
    if (!entry) {
      throw new Error(`guide-registry: unknown href ${href}`);
    }
    return entry;
  });
}

/**
 * Job-group hrefs for nav + playbooks hub. Membership stays primary `channels`;
 * crisis/bargaining/strike stay primary `bargaining`.
 */
export const GUIDE_JOB_GROUP_HREFS: Record<
  GuideJobGroupId,
  readonly string[]
> = {
  training: [
    "/guide/officer-learning",
    GUIDE_STEWARD_PLAYBOOKS_HUB,
    "/guide/steward-101",
  ],
  floor: [
    "/guide/grievance-process",
    "/guide/dfr",
    "/guide/right-to-refuse",
    "/guide/seniority-bumping",
    "/guide/joint-committee",
    "/guide/workplace-mapping",
  ],
  local: [
    "/guide/union-history",
    "/guide/running-meetings",
    "/guide/bylaws",
    "/guide/land-acknowledgement",
    "/guide/membership-signup",
  ],
  campaign: ["/guide/bargaining", "/guide/strike", "/guide/crisis"],
};

export function guideJobGroupEntries(
  id: GuideJobGroupId,
): readonly GuideRegistryEntry[] {
  return registryEntries(GUIDE_JOB_GROUP_HREFS[id]);
}

/** Guides ▾ Steward craft column — hubs plus campaign, not every floor playbook. */
export const GUIDE_NAV_STEWARD_CRAFT_HREFS = [
  GUIDE_STEWARD_PLAYBOOKS_HUB,
  "/guide/steward-101",
  "/guide/bargaining",
  "/guide/strike",
  "/guide/crisis",
] as const;

/** Playbooks hub — training without the hub you are already on. */
const PLAYBOOK_HUB_HREFS: Record<GuideJobGroupId, readonly string[]> = {
  training: ["/guide/officer-learning", "/guide/steward-101"],
  floor: GUIDE_JOB_GROUP_HREFS.floor,
  local: GUIDE_JOB_GROUP_HREFS.local,
  campaign: GUIDE_JOB_GROUP_HREFS.campaign,
};

export const GUIDE_STEWARD_PLAYBOOK_GROUPS: Record<
  GuideJobGroupId,
  readonly GuideRegistryEntry[]
> = {
  training: registryEntries(PLAYBOOK_HUB_HREFS.training),
  floor: registryEntries(PLAYBOOK_HUB_HREFS.floor),
  local: registryEntries(PLAYBOOK_HUB_HREFS.local),
  campaign: registryEntries(PLAYBOOK_HUB_HREFS.campaign),
};

/** Flat list for Blueprint `relatedLinks` (legacy path strip). */
export const GUIDE_BLUEPRINT_PATH_LINKS: readonly GuideRegistryEntry[] = [
  { href: "/guide/social-media-plan", key: "plan", tier: "gold" },
  { href: "/guide/resources", key: "resources", tier: "gold" },
  { href: "/guide/strike", key: "strike", tier: "playbook" },
  { href: "/guide/crisis", key: "crisis", tier: "playbook" },
  { href: "/guide/steward-101", key: "steward101", tier: "playbook" },
  { href: "/guide/union-history", key: "unionHistory", tier: "gold" },
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
  {
    href: "/guide/land-acknowledgement",
    key: "landAcknowledgement",
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
  { href: "/guide/officer-learning", key: "officerLearning" },
  { href: GUIDE_STEWARD_PLAYBOOKS_HUB, key: "stewardPlaybooks" },
  { href: "/guide/steward-101", key: "steward101" },
  { href: "/guide/union-history", key: "unionHistory" },
  { href: "/guide/grievance-process", key: "grievance" },
  { href: "/guide/dfr", key: "dfr" },
  { href: "/guide/seniority-bumping", key: "seniority" },
  { href: "/guide/right-to-refuse", key: "rightToRefuse" },
  { href: "/guide/joint-committee", key: "jointCommittee" },
  { href: "/guide/bargaining", key: "bargaining" },
  { href: "/guide/strike", key: "strike" },
  { href: "/guide/workplace-mapping", key: "workplaceMapping" },
  { href: "/guide/bylaws", key: "bylaws" },
  { href: "/guide/running-meetings", key: "runningMeetings" },
  { href: "/guide/land-acknowledgement", key: "landAcknowledgement" },
];

/**
 * Steward playbooks hub — floor playbooks plus bargaining and membership
 * (membership primary group is `channels`; bargaining is `bargaining`).
 */
export const GUIDE_STEWARD_PLAYBOOK_LINKS: readonly GuideRegistryEntry[] =
  GUIDE_JOB_GROUP_IDS.flatMap((id) => [...GUIDE_STEWARD_PLAYBOOK_GROUPS[id]]);

/** Catalog sections in display order — same groups as GUIDE_REGISTRY. */
export const GUIDE_CATALOG_GROUP_IDS: readonly GuideGroupId[] = [
  "commsPath",
  "channels",
  "bargaining",
  "labour",
];

/** True for `/guide` and `/guide/…`, not `/guides`. */
export function isGuideContentPath(path: string): boolean {
  return path === GUIDE_HUB_PATH || path.startsWith(`${GUIDE_HUB_PATH}/`);
}

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

/** Every `/guide` and `/guide/*` path in PUBLIC_PATHS must appear in the registry (OL modules exempt). */
export function guidePathsMissingFromRegistry(publicGuidePaths: string[]): string[] {
  const registered = new Set(allRegisteredGuidePaths());
  registered.add(GUIDE_HUB_PATH);
  return publicGuidePaths.filter((path) => !registered.has(path));
}
