export type NavLinkKey =
  | "resources"
  | "guide"
  | "stewardPlaybooksHub"
  | "firstWeek"
  | "workshopGuide"
  | "strikeGuide"
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
  | "proposalTracker";

export type NavGroupLabelKey =
  | "learnGroupGuides"
  | "learnGroupStewardWork"
  | "learnGroupChannels"
  | "learnGroupLibraries"
  | "toolsGroupBrand"
  | "toolsGroupBoards"
  | "toolsGroupPrint"
  | "toolsGroupSocialWeb"
  | "toolsGroupStewardPrep";

export type NavLink = {
  href: string;
  key: NavLinkKey;
};

export type NavGroup = {
  labelKey: NavGroupLabelKey;
  links: readonly NavLink[];
};

/** Top-level label key for the Guides disclosure (was Learn). */
export const guidesMenuLabelKey = "guides" as const;

/**
 * Guides ▾ mega-menu — hub-first. Topic playbooks (grievance, DFR, bylaws, …)
 * live on `/guide/steward-playbooks` + Resources, not as mega-menu columns.
 */
export const learnGroups: readonly NavGroup[] = [
  {
    labelKey: "learnGroupGuides",
    links: [
      { href: "/guide", key: "guide" },
      { href: "/guide/social-media-plan", key: "firstWeek" },
      { href: "/guide/resources", key: "resources" },
      { href: "/guide/workshop", key: "workshopGuide" },
    ],
  },
  {
    labelKey: "learnGroupStewardWork",
    links: [
      { href: "/guide/steward-playbooks", key: "stewardPlaybooksHub" },
      { href: "/guide/steward-101", key: "steward101Guide" },
      { href: "/guide/officer-learning", key: "officerLearningGuide" },
      { href: "/guide/bargaining", key: "bargainingGuide" },
      { href: "/guide/crisis", key: "strikeGuide" },
    ],
  },
  {
    labelKey: "learnGroupChannels",
    links: [
      { href: "/guide/print", key: "printGuide" },
      { href: "/guide/union-boards", key: "unionBoardsGuide" },
      { href: "/guide/website", key: "websiteGuide" },
      { href: "/guide/email-broadcast", key: "emailBroadcastGuide" },
      { href: "/guide/short-form", key: "shortFormGuide" },
    ],
  },
  {
    labelKey: "learnGroupLibraries",
    links: [
      { href: "/examples", key: "socialExamples" },
      { href: "/captions", key: "captions" },
      { href: "/guide/photo-consent", key: "photoConsent" },
      { href: "/assets", key: "assets" },
      { href: "/updates", key: "whatsNew" },
      { href: "/manifesto", key: "manifesto" },
      { href: "/install", key: "install" },
    ],
  },
] as const;

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
    labelKey: "toolsGroupStewardPrep",
    links: [
      { href: "/tools/rtw-accommodation", key: "rtwAccommodation" },
      { href: "/tools/pre-disciplinary-log", key: "preDisciplinaryLog" },
      { href: "/tools/complaint-vs-grievance", key: "complaintVsGrievance" },
      { href: "/tools/bylaw-builder", key: "bylawBuilder" },
      { href: "/tools/proposal-tracker", key: "proposalTracker" },
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

const learnHrefs: Set<string> = new Set(
  learnGroups.flatMap((g) => g.links.map((l) => l.href)),
);

export function linkActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // Index routes must not light up on every child page.
  if (href === "/guide" || href === "/tools") return false;
  return pathname.startsWith(`${href}/`);
}

/**
 * Get started: onboarding until Brand Kit identity exists, then first-week roadmap.
 * Brand Kit stays a separate top-level link so chrome does not duplicate `/brand-kit`.
 */
export function getStartedHref(themeEstablished: boolean): string {
  return themeEstablished ? "/guide/social-media-plan" : "/onboarding";
}

export function isLearnPath(pathname: string): boolean {
  return learnHrefs.has(pathname) || pathname.startsWith("/guide/");
}

export function isToolsPath(pathname: string): boolean {
  return pathname === "/tools" || pathname.startsWith("/tools/");
}

export function flatNavLinks(groups: readonly NavGroup[]): NavLink[] {
  return groups.flatMap((g) => [...g.links]);
}
