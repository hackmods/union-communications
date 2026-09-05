import {
  GUIDE_CATALOG_PATH,
  GUIDE_JOB_GROUP_HREFS,
  GUIDE_NAV_STEWARD_CRAFT_HREFS,
  registryEntryByHref,
} from "@/lib/comms/guide-registry";

export type NavLinkKey =
  | "resources"
  | "guide"
  | "stewardPlaybooksHub"
  | "firstWeek"
  | "workshopGuide"
  | "strikeGuide"
  | "strikeOpsGuide"
  | "crisisCommsGuide"
  | "photoConsent"
  | "membershipSignupGuide"
  | "printGuide"
  | "unionBoardsGuide"
  | "websiteGuide"
  | "emailBroadcastGuide"
  | "shortFormGuide"
  | "steward101Guide"
  | "officerLearningGuide"
  | "workplaceMappingGuide"
  | "grievanceProcessGuide"
  | "dfrGuide"
  | "rightToRefuseGuide"
  | "seniorityGuide"
  | "jointCommitteeGuide"
  | "bargainingGuide"
  | "bylawsGuide"
  | "runningMeetingsGuide"
  | "landAcknowledgementGuide"
  | "socialExamples"
  | "captions"
  | "assets"
  | "manifesto"
  | "whatsNew"
  | "install"
  | "logoBuilder"
  | "resizer"
  | "documentGenerator"
  | "boardBanner"
  | "boardNotice"
  | "solidarityPoster"
  | "qrBoard"
  | "orgChart"
  | "qrCard"
  | "actionCard"
  | "pulsePoll"
  | "flyerMaker"
  | "graphicMaker"
  | "quoteCard"
  | "meetingBackground"
  | "websiteTemplate"
  | "altText"
  | "rtwAccommodation"
  | "preDisciplinaryLog"
  | "complaintVsGrievance"
  | "bylawBuilder"
  | "proposalTracker"
  | "rulesOfOrder";

export type NavGroupLabelKey =
  | "learnGroupGuides"
  | "learnGroupStewardTraining"
  | "learnGroupChannels"
  | "learnGroupLibraries"
  | "learnGroupFloorLocal"
  | "toolsGroupBrand"
  | "toolsGroupBoards"
  | "toolsGroupPrint"
  | "toolsGroupSocialWeb"
  | "toolsGroupStewardWorksheets";

export type NavSubgroupLabelKey = "learnSubgroupFloor" | "learnSubgroupLocal";

export type NavLink = {
  href: string;
  key: NavLinkKey;
};

export type NavSubgroup = {
  labelKey: NavSubgroupLabelKey;
  links: readonly NavLink[];
};

export type NavGroup = {
  labelKey: NavGroupLabelKey;
  links: readonly NavLink[];
  subgroups?: readonly NavSubgroup[];
};

/** Officer Learning — top-level header link; not nested under Guides ▾. */
export const OFFICER_LEARNING_HREF = "/guide/officer-learning" as const;

/** Top-level label key for the Guides disclosure (was Learn). */
export const guidesMenuLabelKey = "guides" as const;

function navLinksFromHrefs(hrefs: readonly string[]): NavLink[] {
  return hrefs.map((href) => {
    const entry = registryEntryByHref(href);
    if (!entry?.navKey) {
      throw new Error(`nav-config: missing registry navKey for ${href}`);
    }
    return { href, key: entry.navKey as NavLinkKey };
  });
}

/**
 * Guides ▾ mega-menu — toolkit-first. Comms practice, channels, then
 * steward craft. Officer Learning is a top-level header link, not nested here.
 * Floor and local playbooks sit in a grouped column (collapsed below 2xl).
 * Resources (bibliography) sits in Libraries. About links stay in the footer.
 */
export const learnGroups: readonly NavGroup[] = [
  {
    labelKey: "learnGroupGuides",
    links: navLinksFromHrefs([
      "/guide/social-media-plan",
      "/guide",
      "/guide/workshop",
    ]),
  },
  {
    labelKey: "learnGroupChannels",
    links: navLinksFromHrefs([
      "/guide/print",
      "/guide/union-boards",
      "/guide/website",
      "/guide/email-broadcast",
      "/guide/short-form",
    ]),
  },
  {
    labelKey: "learnGroupStewardTraining",
    links: navLinksFromHrefs(GUIDE_NAV_STEWARD_CRAFT_HREFS),
  },
  {
    labelKey: "learnGroupFloorLocal",
    links: [],
    subgroups: [
      {
        labelKey: "learnSubgroupFloor",
        links: navLinksFromHrefs(GUIDE_JOB_GROUP_HREFS.floor),
      },
      {
        labelKey: "learnSubgroupLocal",
        links: navLinksFromHrefs(GUIDE_JOB_GROUP_HREFS.local),
      },
    ],
  },
  {
    labelKey: "learnGroupLibraries",
    links: [
      { href: "/examples", key: "socialExamples" },
      { href: "/captions", key: "captions" },
      { href: "/guide/photo-consent", key: "photoConsent" },
      { href: "/assets", key: "assets" },
      { href: "/guide/resources", key: "resources" },
    ],
  },
];

/** Hub-backed authoring tool — hide unless Officer Hub login is on and the user is signed in. */
export const PULSE_POLL_HREF = "/tools/pulse-poll" as const;

/**
 * Tools ▾ + `/tools` catalog. Group by **job**, not First week channel.
 * Brand = set the look; boards = cork-board pieces; Print & cards = handouts
 * (wallet pack folded in); Social & web = post and publish.
 * @see docs/audit/session-knowledge-2026-08-18-tools-catalog-ia.md
 */
export const toolGroups: readonly NavGroup[] = [
  {
    labelKey: "toolsGroupBrand",
    links: [
      { href: "/tools/logo-builder", key: "logoBuilder" },
      { href: "/tools/resizer", key: "resizer" },
      { href: "/tools/document-generator", key: "documentGenerator" },
    ],
  },
  {
    labelKey: "toolsGroupBoards",
    links: [
      { href: "/tools/board-banner", key: "boardBanner" },
      { href: "/tools/board-notice", key: "boardNotice" },
      { href: "/tools/solidarity-poster", key: "solidarityPoster" },
      { href: "/tools/qr-board", key: "qrBoard" },
      { href: "/tools/org-chart", key: "orgChart" },
    ],
  },
  {
    labelKey: "toolsGroupPrint",
    links: [
      { href: "/tools/flyer-maker", key: "flyerMaker" },
      { href: "/tools/qr-card", key: "qrCard" },
      { href: "/tools/action-card", key: "actionCard" },
      { href: PULSE_POLL_HREF, key: "pulsePoll" },
    ],
  },
  {
    labelKey: "toolsGroupSocialWeb",
    links: [
      { href: "/tools/graphic-maker", key: "graphicMaker" },
      { href: "/tools/quote-card", key: "quoteCard" },
      { href: "/tools/meeting-background", key: "meetingBackground" },
      { href: "/tools/website-template", key: "websiteTemplate" },
      { href: "/tools/alt-text", key: "altText" },
    ],
  },
  {
    labelKey: "toolsGroupStewardWorksheets",
    links: [
      { href: "/tools/rtw-accommodation", key: "rtwAccommodation" },
      { href: "/tools/pre-disciplinary-log", key: "preDisciplinaryLog" },
      { href: "/tools/complaint-vs-grievance", key: "complaintVsGrievance" },
      { href: "/tools/bylaw-builder", key: "bylawBuilder" },
      { href: "/tools/proposal-tracker", key: "proposalTracker" },
      { href: "/tools/rules-of-order", key: "rulesOfOrder" },
    ],
  },
] as const;

/**
 * Pulse Poll publishes to the Officer Hub, so it is not a public Comms tool.
 * Hide it when login is soft-launched off, or when the visitor is anonymous.
 */
export function visibleToolGroups(options: {
  officerHubPublic: boolean;
  authenticated: boolean;
}): NavGroup[] {
  const showPulsePoll = options.officerHubPublic && options.authenticated;
  if (showPulsePoll) return [...toolGroups];

  return toolGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => link.href !== PULSE_POLL_HREF),
    }))
    .filter((group) => group.links.length > 0);
}

export function flatNavLinks(groups: readonly NavGroup[]): NavLink[] {
  return groups.flatMap((g) => [
    ...g.links,
    ...(g.subgroups?.flatMap((s) => [...s.links]) ?? []),
  ]);
}

const learnHrefs: Set<string> = new Set(
  flatNavLinks(learnGroups).map((l) => l.href),
);

export function linkActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // Index routes must not light up on every child page.
  if (
    href === "/guide" ||
    href === "/tools" ||
    href === GUIDE_CATALOG_PATH
  ) {
    return false;
  }
  return pathname.startsWith(`${href}/`);
}

/**
 * Get started lands on the Home toolkit chooser (Comms / steward / officers).
 * Brand Kit stays a separate top-level link. Comms onboarding is the Comms
 * path card, not this chrome CTA.
 */
export const GET_STARTED_HREF = "/#toolkit" as const;

export function getStartedHref(): string {
  return GET_STARTED_HREF;
}

export function isOfficerLearningPath(pathname: string): boolean {
  return (
    pathname === OFFICER_LEARNING_HREF ||
    pathname.startsWith(`${OFFICER_LEARNING_HREF}/`)
  );
}

export function isLearnPath(pathname: string): boolean {
  if (isOfficerLearningPath(pathname)) return false;
  if (pathname === GUIDE_CATALOG_PATH) return true;
  return learnHrefs.has(pathname) || pathname.startsWith("/guide/");
}

export function isToolsPath(pathname: string): boolean {
  return pathname === "/tools" || pathname.startsWith("/tools/");
}

