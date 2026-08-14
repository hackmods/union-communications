export type NavLinkKey =
  | "resources"
  | "guide"
  | "firstWeek"
  | "workshopGuide"
  | "strikeGuide"
  | "photoConsent"
  | "membershipSignupGuide"
  | "printGuide"
  | "unionBoardsGuide"
  | "websiteGuide"
  | "emailBroadcastGuide"
  | "socialExamples"
  | "captions"
  | "assets"
  | "manifesto"
  | "install"
  | "logoBuilder"
  | "resizer"
  | "documentGenerator"
  | "boardBanner"
  | "boardNotice"
  | "solidarityPoster"
  | "qrBoard"
  | "qrCard"
  | "actionCard"
  | "pulsePoll"
  | "flyerMaker"
  | "graphicMaker"
  | "quoteCard"
  | "meetingBackground"
  | "websiteTemplate"
  | "altText";

export type NavGroupLabelKey =
  | "learnGroupGuides"
  | "learnGroupChannels"
  | "learnGroupLibraries"
  | "learnGroupAbout"
  | "toolsGroupBrand"
  | "toolsGroupBoards"
  | "toolsGroupPrint"
  | "toolsGroupSocialWeb";

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

export const learnGroups: readonly NavGroup[] = [
  {
    labelKey: "learnGroupGuides",
    links: [
      { href: "/guide/resources", key: "resources" },
      { href: "/guide", key: "guide" },
      { href: "/guide/social-media-plan", key: "firstWeek" },
      { href: "/guide/workshop", key: "workshopGuide" },
      { href: "/guide/crisis", key: "strikeGuide" },
      { href: "/guide/photo-consent", key: "photoConsent" },
      { href: "/guide/membership-signup", key: "membershipSignupGuide" },
    ],
  },
  {
    labelKey: "learnGroupChannels",
    links: [
      { href: "/guide/print", key: "printGuide" },
      { href: "/guide/union-boards", key: "unionBoardsGuide" },
      { href: "/guide/website", key: "websiteGuide" },
      { href: "/guide/email-broadcast", key: "emailBroadcastGuide" },
    ],
  },
  {
    labelKey: "learnGroupLibraries",
    links: [
      { href: "/examples", key: "socialExamples" },
      { href: "/captions", key: "captions" },
    ],
  },
  {
    labelKey: "learnGroupAbout",
    links: [
      { href: "/assets", key: "assets" },
      { href: "/manifesto", key: "manifesto" },
      { href: "/install", key: "install" },
    ],
  },
] as const;

/** Hub-backed authoring tool — hide unless Officer Hub login is on and the user is signed in. */
export const PULSE_POLL_HREF = "/tools/pulse-poll" as const;

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
      { href: "/tools/qr-card", key: "qrCard" },
      { href: "/tools/action-card", key: "actionCard" },
    ],
  },
  {
    labelKey: "toolsGroupPrint",
    links: [{ href: "/tools/flyer-maker", key: "flyerMaker" }],
  },
  {
    labelKey: "toolsGroupSocialWeb",
    links: [
      { href: "/tools/graphic-maker", key: "graphicMaker" },
      { href: "/tools/quote-card", key: "quoteCard" },
      { href: "/tools/meeting-background", key: "meetingBackground" },
      { href: "/tools/website-template", key: "websiteTemplate" },
      { href: "/tools/alt-text", key: "altText" },
      { href: PULSE_POLL_HREF, key: "pulsePoll" },
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
