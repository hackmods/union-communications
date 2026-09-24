export type NavLinkKey =
  | "resources"
  | "guide"
  | "stewardPlaybooksHub"
  | "firstWeek"
  | "workshopGuide"
  | "workshopsHub"
  | "landAckWorkshopGuide"
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
  | "letterGenerator"
  | "grievanceFormBuilder"
  | "caSnippets"
  | "stewardQuickLog"
  | "boardBanner"
  | "boardNotice"
  | "solidarityPoster"
  | "qrBoard"
  | "orgChart"
  | "localPack"
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
  | "toolsGroupCreation"
  | "toolsGroupUtility"
  | "toolsGroupBrand"
  | "toolsGroupBoards"
  | "toolsGroupPrint"
  | "toolsGroupSocialWeb"
  | "toolsGroupStewardWorksheets";

export type NavLink = { href: string; key: NavLinkKey };
export type NavGroup = { labelKey: NavGroupLabelKey; links: readonly NavLink[] };

export type {
  ToolSurface,
  UtilityToolSlug,
} from "@/lib/seo/utility-tool-slugs";
export {
  UTILITY_TOOL_SLUGS,
  UTILITY_TOOL_SLUG_SET,
  toolSurfaceForSlug,
} from "@/lib/seo/utility-tool-slugs";

export type PublicPrimaryNavKey =
  | "brandKit"
  | "create"
  | "utilities"
  | "learn"
  | "platform";
export type PublicPrimaryNavHref =
  | "/create/brand-kit"
  | "/create"
  | "/utilities"
  | "/learn"
  | "/platform";
export type PublicPrimaryNavItem = {
  href: PublicPrimaryNavHref;
  key: PublicPrimaryNavKey;
};

/**
 * Primary public destinations: setup, creative output, practical work,
 * learning, and hosted platform — not guided-setup checklists (those stay on /start).
 */
export const PUBLIC_PRIMARY_NAV: readonly PublicPrimaryNavItem[] = [
  { href: "/create/brand-kit", key: "brandKit" },
  { href: "/create", key: "create" },
  { href: "/utilities", key: "utilities" },
  { href: "/learn", key: "learn" },
  { href: "/platform", key: "platform" },
] as const;

export function isPublicPrimaryNavActive(
  pathname: string,
  href: PublicPrimaryNavHref,
): boolean {
  if (href === "/create/brand-kit") return pathname === href;
  if (href === "/create") {
    return (
      pathname === href ||
      (pathname.startsWith(`${href}/`) && !pathname.startsWith("/create/brand-kit"))
    );
  }
  if (href === "/utilities") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === "/platform") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const PULSE_POLL_HREF = "/tools/pulse-poll" as const;

/** Job-grouped tools registry, consumed by the shared public catalog. */
export const toolGroups: readonly NavGroup[] = [
  {
    labelKey: "toolsGroupCreation",
    links: [
      { href: "/tools/letter-generator", key: "letterGenerator" },
      { href: "/tools/document-generator", key: "documentGenerator" },
      { href: "/tools/graphic-maker", key: "graphicMaker" },
      { href: "/tools/flyer-maker", key: "flyerMaker" },
      { href: "/tools/board-banner", key: "boardBanner" },
      { href: "/tools/board-notice", key: "boardNotice" },
      { href: "/tools/solidarity-poster", key: "solidarityPoster" },
      { href: "/tools/qr-board", key: "qrBoard" },
      { href: "/tools/qr-card", key: "qrCard" },
      { href: "/tools/action-card", key: "actionCard" },
      { href: "/tools/quote-card", key: "quoteCard" },
      { href: "/tools/meeting-background", key: "meetingBackground" },
      { href: "/tools/org-chart", key: "orgChart" },
      { href: "/tools/logo-builder", key: "logoBuilder" },
      { href: "/tools/website-template", key: "websiteTemplate" },
    ],
  },
  {
    labelKey: "toolsGroupUtility",
    links: [
      { href: "/tools/rtw-accommodation", key: "rtwAccommodation" },
      { href: "/tools/grievance-form-builder", key: "grievanceFormBuilder" },
      { href: "/tools/ca-snippets", key: "caSnippets" },
      { href: "/tools/steward-quick-log", key: "stewardQuickLog" },
      { href: "/tools/pre-disciplinary-log", key: "preDisciplinaryLog" },
      { href: "/tools/complaint-vs-grievance", key: "complaintVsGrievance" },
      { href: "/tools/bylaw-builder", key: "bylawBuilder" },
      { href: "/tools/proposal-tracker", key: "proposalTracker" },
      { href: "/tools/rules-of-order", key: "rulesOfOrder" },
      { href: "/tools/local-pack", key: "localPack" },
      { href: "/tools/resizer", key: "resizer" },
      { href: "/tools/alt-text", key: "altText" },
      { href: PULSE_POLL_HREF, key: "pulsePoll" },
    ],
  },
] as const;
