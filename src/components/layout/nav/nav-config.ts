export type NavLinkKey =
  | "resources"
  | "guide"
  | "firstWeek"
  | "strikeGuide"
  | "photoConsent"
  | "membershipSignupGuide"
  | "printGuide"
  | "unionBoardsGuide"
  | "websiteGuide"
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
    ],
  },
] as const;

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
