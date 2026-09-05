/**
 * Operator content review catalog — aggregates existing registries for /build/review.
 * Do not hand-maintain duplicate href lists; derive from PUBLIC_PATHS, nav, guides, hub.
 */
import { GUIDE_REGISTRY, type GuideGroupId } from "@/lib/comms/guide-registry";
import { toolGroups, learnGroups } from "@/components/layout/nav/nav-config";
import { HUB_TOOL_CATALOG } from "@/components/hub/hub-tool-catalog";
import { HUB_TOOL_GROUPS } from "@/components/hub/hub-nav-model";
import { MODULE_REGISTRY } from "@/lib/modules/registry";
import { PUBLIC_PATHS } from "@/app/sitemap";
import { TOOL_SLUGS } from "@/lib/seo/tool-meta";

export type ContentReviewTag = "pdf" | "canvas" | "hub" | "portal";

export type ContentReviewEntry = {
  href: string;
  /** `nav` namespace key when set */
  navKey?: string;
  /** `buildReview.links` namespace key when navKey absent */
  labelKey?: string;
  tags?: readonly ContentReviewTag[];
};

export type ContentReviewSection = {
  id: string;
  /** `buildReview.sections.*` */
  labelKey: string;
  /** Optional verify hint — `buildReview.hints.*` */
  hintKey?: string;
  requiresAuth?: boolean;
  entries: readonly ContentReviewEntry[];
};

/** Map guide-registry keys to existing nav label keys. */
const GUIDE_KEY_TO_NAV: Record<string, string> = {
  plan: "socialMediaPlan",
  blueprint: "guide",
  resources: "resources",
  workshop: "workshopGuide",
  photoConsent: "photoConsent",
  unionBoards: "unionBoardsGuide",
  print: "printGuide",
  website: "websiteGuide",
  email: "emailBroadcastGuide",
  shortForm: "shortFormGuide",
  membershipSignup: "membershipSignupGuide",
  bargaining: "bargainingGuide",
  strike: "strikeOpsGuide",
  crisis: "crisisCommsGuide",
  officerLearning: "officerLearningGuide",
  stewardPlaybooks: "stewardPlaybooksHub",
  steward101: "steward101Guide",
  grievance: "grievanceProcessGuide",
  dfr: "dfrGuide",
  seniority: "seniorityGuide",
  rightToRefuse: "rightToRefuseGuide",
  jointCommittee: "jointCommitteeGuide",
  workplaceMapping: "workplaceMappingGuide",
  bylaws: "bylawsGuide",
  runningMeetings: "runningMeetingsGuide",
  landAcknowledgement: "landAcknowledgementGuide",
};

const GUIDE_GROUP_LABEL: Record<GuideGroupId, string> = {
  commsPath: "learnGroupGuides",
  channels: "learnGroupChannels",
  bargaining: "learnGroupStewardTraining",
  labour: "learnGroupStewardTraining",
};

const SITE_SHELL_PATHS: readonly { href: string; navKey: string }[] = [
  { href: "/", navKey: "home" },
  { href: "/manifesto", navKey: "manifesto" },
  { href: "/updates", navKey: "whatsNew" },
  { href: "/support", navKey: "support" },
  { href: "/install", navKey: "install" },
  { href: "/privacy", navKey: "privacy" },
  { href: "/security", navKey: "security" },
  { href: "/accessibility", navKey: "accessibility" },
  { href: "/feedback", navKey: "feedback" },
  { href: "/onboarding", navKey: "getStarted" },
  { href: "/brand-kit", navKey: "brandKit" },
  { href: "/tools", navKey: "tools" },
  { href: "/guide", navKey: "guides" },
];

const LIBRARY_PATHS: readonly { href: string; navKey: string }[] = [
  { href: "/examples", navKey: "socialExamples" },
  { href: "/captions", navKey: "captions" },
  { href: "/assets", navKey: "assets" },
];

const OFFICER_LEARNING_MODULES: readonly { href: string; labelKey: string }[] = [
  { href: "/guide/officer-learning/contract-enforcement", labelKey: "olContractEnforcement" },
  { href: "/guide/officer-learning/progressive-discipline", labelKey: "olProgressiveDiscipline" },
  { href: "/guide/officer-learning/human-rights-accommodation", labelKey: "olHumanRights" },
  { href: "/guide/officer-learning/democratic-governance", labelKey: "olDemocraticGovernance" },
  { href: "/guide/officer-learning/financial-health", labelKey: "olFinancialHealth" },
  { href: "/guide/officer-learning/building-collective-power", labelKey: "olCollectivePower" },
];

/** Pages where stewards download text or canvas PDFs (button on page). */
const PDF_EXPORT_SURFACES: readonly ContentReviewEntry[] = [
  { href: "/guide/land-acknowledgement", navKey: "landAcknowledgementGuide", tags: ["pdf"] },
  { href: "/guide/union-boards", navKey: "unionBoardsGuide", tags: ["pdf"] },
  ...OFFICER_LEARNING_MODULES.map((m) => ({ ...m, tags: ["pdf"] as const })),
  { href: "/tools/rtw-accommodation", navKey: "rtwAccommodation", tags: ["pdf"] },
  { href: "/tools/pre-disciplinary-log", navKey: "preDisciplinaryLog", tags: ["pdf"] },
  { href: "/tools/complaint-vs-grievance", navKey: "complaintVsGrievance", tags: ["pdf"] },
  { href: "/tools/bylaw-builder", navKey: "bylawBuilder", tags: ["pdf"] },
  { href: "/tools/flyer-maker", navKey: "flyerMaker", tags: ["canvas"] },
  { href: "/tools/board-notice", navKey: "boardNotice", tags: ["canvas"] },
  { href: "/tools/solidarity-poster", navKey: "solidarityPoster", tags: ["canvas"] },
  { href: "/tools/action-card", navKey: "actionCard", tags: ["canvas"] },
  { href: "/tools/qr-card", navKey: "qrCard", tags: ["canvas"] },
  { href: "/tools/qr-board", navKey: "qrBoard", tags: ["canvas"] },
  { href: "/tools/board-banner", navKey: "boardBanner", tags: ["canvas"] },
  { href: "/tools/org-chart", navKey: "orgChart", tags: ["canvas"] },
];

const PORTAL_PATHS: readonly { href: string; labelKey: string }[] = [
  { href: "/portal", labelKey: "portalHome" },
  { href: "/portal/fronts", labelKey: "portalFronts" },
  { href: "/portal/dispatch", labelKey: "portalDispatch" },
  { href: "/portal/sidebars", labelKey: "portalSidebars" },
  { href: "/portal/send-feedback", labelKey: "portalFeedback" },
];

const HUB_MODULE_LABEL: Record<string, string> = {
  grievance: "modules.grievance",
  bumping: "modules.bumping",
  time: "modules.time",
  discussions: "modules.discussions",
  tasks: "modules.tasks",
  informalLog: "modules.informalLog",
  checkins: "modules.checkins",
};

function guideEntriesFromRegistry(): ContentReviewEntry[] {
  const seen = new Set<string>();
  const entries: ContentReviewEntry[] = [];

  for (const [groupId, groupEntries] of Object.entries(GUIDE_REGISTRY) as [
    GuideGroupId,
    (typeof GUIDE_REGISTRY)[GuideGroupId],
  ][]) {
    void groupId;
    for (const entry of groupEntries) {
      if (seen.has(entry.href)) continue;
      seen.add(entry.href);
      entries.push({
        href: entry.href,
        navKey: GUIDE_KEY_TO_NAV[entry.key],
      });
    }
  }

  const extraGuidePaths = PUBLIC_PATHS.filter(
    (p) =>
      p.startsWith("/guide/") &&
      p !== "/guide" &&
      !seen.has(p) &&
      !p.startsWith("/guide/officer-learning/"),
  );
  const EXTRA_GUIDE_NAV: Record<string, string> = {
    "/guide/steward-playbooks": "stewardPlaybooksHub",
    "/guide/membership-signup": "membershipSignupGuide",
  };
  for (const href of extraGuidePaths) {
    seen.add(href);
    const navKey = EXTRA_GUIDE_NAV[href];
    if (navKey) {
      entries.push({ href, navKey });
    } else {
      const slug = href.replace("/guide/", "");
      entries.push({
        href,
        labelKey: `guideExtra_${slug.replace(/-/g, "_")}`,
      });
    }
  }

  return entries;
}

function hubEntries(): ContentReviewEntry[] {
  const seen = new Set<string>();
  const entries: ContentReviewEntry[] = [];

  for (const mod of MODULE_REGISTRY) {
    if (!mod.href.startsWith("/app/")) continue;
    if (seen.has(mod.href)) continue;
    seen.add(mod.href);
    entries.push({
      href: mod.href,
      labelKey: HUB_MODULE_LABEL[mod.id] ?? `modules.${mod.nameKey}`,
      tags: ["hub"],
    });
  }

  for (const tool of HUB_TOOL_CATALOG) {
    if (seen.has(tool.href)) continue;
    seen.add(tool.href);
    entries.push({
      href: tool.href,
      labelKey: `hubTool.${tool.labelKey}`,
      tags: ["hub"],
    });
  }

  entries.push({ href: "/app", labelKey: "hubDashboard", tags: ["hub"] });
  entries.push({ href: "/app/login", labelKey: "hubLogin", tags: ["hub"] });

  return entries.sort((a, b) => a.href.localeCompare(b.href));
}

/** Build grouped catalog for the review page. */
export function buildContentReviewCatalog(): ContentReviewSection[] {
  const guideEntries = guideEntriesFromRegistry();

  const toolEntries: ContentReviewEntry[] = toolGroups.flatMap((group) =>
    group.links.map((link) => ({
      href: link.href,
      navKey: link.key,
      tags: PDF_EXPORT_SURFACES.some((p) => p.href === link.href && p.tags?.includes("canvas"))
        ? (["canvas"] as const)
        : undefined,
    })),
  );

  const learnExtraEntries: ContentReviewEntry[] = learnGroups.flatMap((group) =>
    group.links
      .filter((link) => !guideEntries.some((e) => e.href === link.href))
      .filter((link) => !LIBRARY_PATHS.some((l) => l.href === link.href))
      .filter((link) => link.href !== "/guide" && link.href !== "/tools")
      .map((link) => ({ href: link.href, navKey: link.key })),
  );

  const mergedGuides = [...guideEntries];
  for (const extra of learnExtraEntries) {
    if (!mergedGuides.some((e) => e.href === extra.href)) {
      mergedGuides.push(extra);
    }
  }

  return [
    {
      id: "siteShell",
      labelKey: "siteShell",
      entries: SITE_SHELL_PATHS.map(({ href, navKey }) => ({ href, navKey })),
    },
    {
      id: "tools",
      labelKey: "tools",
      hintKey: "tools",
      entries: toolEntries,
    },
    {
      id: "guides",
      labelKey: "guides",
      hintKey: "guides",
      entries: mergedGuides.sort((a, b) => a.href.localeCompare(b.href)),
    },
    {
      id: "officerLearning",
      labelKey: "officerLearning",
      hintKey: "pdfText",
      entries: [
        { href: "/guide/officer-learning", navKey: "officerLearningGuide" },
        ...OFFICER_LEARNING_MODULES.map((m) => ({ href: m.href, labelKey: m.labelKey, tags: ["pdf"] as const })),
      ],
    },
    {
      id: "libraries",
      labelKey: "libraries",
      entries: LIBRARY_PATHS.map(({ href, navKey }) => ({ href, navKey })),
    },
    {
      id: "pdfExports",
      labelKey: "pdfExports",
      hintKey: "pdfText",
      entries: PDF_EXPORT_SURFACES,
    },
    {
      id: "hub",
      labelKey: "hub",
      hintKey: "hub",
      requiresAuth: true,
      entries: hubEntries(),
    },
    {
      id: "portal",
      labelKey: "portal",
      hintKey: "portal",
      requiresAuth: true,
      entries: PORTAL_PATHS.map(({ href, labelKey }) => ({
        href,
        labelKey,
        tags: ["portal"] as const,
      })),
    },
  ];
}

/** Flat unique hrefs across all sections (for completeness tests). */
export function allContentReviewHrefs(catalog = buildContentReviewCatalog()): string[] {
  const hrefs = new Set<string>();
  for (const section of catalog) {
    for (const entry of section.entries) {
      hrefs.add(entry.href);
    }
  }
  return [...hrefs].sort();
}

/** Guide group nav label keys for subsection display (optional). */
export { GUIDE_GROUP_LABEL, GUIDE_KEY_TO_NAV };

/** Exported for tests — public tool paths from SEO registry. */
export function publicToolPaths(): string[] {
  return TOOL_SLUGS.filter((slug) => slug !== "pulse-poll").map((slug) => `/tools/${slug}`);
}

/** Hub tool group order for display hints. */
export { HUB_TOOL_GROUPS };
