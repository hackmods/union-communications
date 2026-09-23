import { toolGroups, type NavLinkKey } from "@/components/layout/nav/nav-config";
import {
  GUIDE_CATALOG_GROUP_IDS,
  GUIDE_REGISTRY,
  type GuideGroupId,
  type GuideRegistryEntry,
} from "@/lib/comms/guide-registry";
import { OFFICER_LEARNING_MODULES } from "@/lib/officer-learning/modules";
import { canonicalPublicPath } from "@/lib/seo/public-routes";
import { hiddenGuidePathsForPreset } from "@/lib/comms/preset-guide-visibility";

export type PublicCatalogKind =
  | "tool"
  | "guide"
  | "playbook"
  | "course"
  | "workshop"
  | "library";
export type PublicCatalogAudience =
  | "comms"
  | "steward"
  | "officer"
  | "member";
export type PublicCatalogTopic =
  | "brand"
  | "boards"
  | "print"
  | "social"
  | "web"
  | "workplace"
  | "grievances"
  | "safety"
  | "governance"
  | "bargaining"
  | "training"
  | "workshops"
  | "accessibility";
export type PublicCatalogFormat =
  | "maker"
  | "worksheet"
  | "playbook"
  | "course"
  | "workshop"
  | "library";
export type PublicCatalogDeliverable =
  | "brand-kit"
  | "logo-files"
  | "resized-image-files"
  | "office-document-files"
  | "banner-files"
  | "board-notice-files"
  | "poster-files"
  | "qr-board-files"
  | "roster-files"
  | "flyer-files"
  | "qr-card-files"
  | "action-card-files"
  | "pulse-survey"
  | "social-graphic-files"
  | "quote-card-files"
  | "meeting-background-files"
  | "website-files"
  | "alt-text-draft"
  | "accommodation-worksheet"
  | "discipline-log"
  | "grievance-decision-sheet"
  | "bylaw-draft"
  | "proposal-package"
  | "meeting-phrases"
  | "guide-checklists"
  | "learning-module"
  | "facilitator-run-sheet"
  | "reference-library"
  | "communications-examples";
export type PublicCatalogStorage =
  | "on-device"
  | "on-device-hub-optional"
  | "officer-hub"
  | "none";
export type PublicCatalogAuth = "public" | "signed-in";
export type PublicCatalogMessageNamespace =
  | "toolsIndex"
  | "guidesIndex"
  | "publicCatalog"
  | "officerLearning";

export type PublicCatalogTitleNamespace = "nav" | "officerLearning";

export type PublicCatalogItem = {
  id: string;
  kind: PublicCatalogKind;
  canonicalPath: string;
  legacyPaths: readonly string[];
  titleKey: NavLinkKey | string;
  titleNamespace?: PublicCatalogTitleNamespace;
  summaryKey: string;
  summaryNamespace: PublicCatalogMessageNamespace;
  deliverableKey: PublicCatalogDeliverable;
  searchTermsKey?: string;
  audiences: readonly PublicCatalogAudience[];
  topics: readonly PublicCatalogTopic[];
  formats: readonly PublicCatalogFormat[];
  estimatedMinutes: number;
  storageMode: PublicCatalogStorage;
  authRequirement: PublicCatalogAuth;
  featureGate?: "officerHubPublic";
  relatedItemIds: readonly string[];
};

const TOOL_TOPIC: Record<string, PublicCatalogTopic> = {
  toolsGroupBrand: "brand",
  toolsGroupBoards: "boards",
  toolsGroupPrint: "print",
  toolsGroupSocialWeb: "social",
  toolsGroupStewardWorksheets: "workplace",
};

const TOOL_AUDIENCE: Record<string, readonly PublicCatalogAudience[]> = {
  toolsGroupBrand: ["comms", "officer"],
  toolsGroupBoards: ["comms", "steward"],
  toolsGroupPrint: ["comms", "steward"],
  toolsGroupSocialWeb: ["comms", "officer"],
  toolsGroupStewardWorksheets: ["steward", "officer"],
};

const TOOL_KIND: Record<string, PublicCatalogFormat> = {
  "rtw-accommodation": "worksheet",
  "pre-disciplinary-log": "worksheet",
  "complaint-vs-grievance": "worksheet",
  "bylaw-builder": "worksheet",
  "proposal-tracker": "worksheet",
  "rules-of-order": "worksheet",
};

const TOOL_DELIVERABLE: Record<string, PublicCatalogDeliverable> = {
  "logo-builder": "logo-files",
  resizer: "resized-image-files",
  "document-generator": "office-document-files",
  "board-banner": "banner-files",
  "board-notice": "board-notice-files",
  "solidarity-poster": "poster-files",
  "qr-board": "qr-board-files",
  "org-chart": "roster-files",
  "flyer-maker": "flyer-files",
  "qr-card": "qr-card-files",
  "action-card": "action-card-files",
  "pulse-poll": "pulse-survey",
  "graphic-maker": "social-graphic-files",
  "quote-card": "quote-card-files",
  "meeting-background": "meeting-background-files",
  "website-template": "website-files",
  "alt-text": "alt-text-draft",
  "rtw-accommodation": "accommodation-worksheet",
  "pre-disciplinary-log": "discipline-log",
  "complaint-vs-grievance": "grievance-decision-sheet",
  "bylaw-builder": "bylaw-draft",
  "proposal-tracker": "proposal-package",
  "rules-of-order": "meeting-phrases",
};

const TOOL_SEARCH_TERMS: Readonly<Record<string, string>> = {
  "logo-builder": "tool-logo-builder",
  "document-generator": "tool-document-generator",
  "board-notice": "tool-board-notice",
  "qr-board": "tool-qr-board",
  "org-chart": "tool-org-chart",
  "flyer-maker": "tool-flyer-maker",
  "qr-card": "tool-qr-card",
  "action-card": "tool-action-card",
  "graphic-maker": "tool-graphic-maker",
  "quote-card": "tool-quote-card",
  "website-template": "tool-website-template",
  "alt-text": "tool-alt-text",
  "rtw-accommodation": "tool-rtw-accommodation",
  "pre-disciplinary-log": "tool-pre-disciplinary-log",
  "complaint-vs-grievance": "tool-complaint-vs-grievance",
  "bylaw-builder": "tool-bylaw-builder",
  "proposal-tracker": "tool-proposal-tracker",
  "rules-of-order": "tool-rules-of-order",
};

function catalogId(path: string): string {
  return path
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-$/, "");
}

function toolItems(): PublicCatalogItem[] {
  const items: PublicCatalogItem[] = toolGroups.flatMap((group) =>
    group.links.map(({ href, key }) => {
      const slug = href.slice("/tools/".length);
      const gated = slug === "pulse-poll";
      const format = TOOL_KIND[slug] ?? "maker";
      const deliverableKey = TOOL_DELIVERABLE[slug];
      if (!deliverableKey) {
        throw new Error(`Missing public catalog deliverable for tool: ${slug}`);
      }
      return {
        id: catalogId(canonicalPublicPath(href)),
        kind: "tool" as const,
        canonicalPath: canonicalPublicPath(href),
        legacyPaths: [href],
        titleKey: key,
        titleNamespace: "nav",
        summaryKey: key,
        summaryNamespace: "toolsIndex" as const,
        deliverableKey,
        ...(TOOL_SEARCH_TERMS[slug]
          ? { searchTermsKey: TOOL_SEARCH_TERMS[slug] }
          : {}),
        audiences: TOOL_AUDIENCE[group.labelKey] ?? ["comms"],
        topics: [TOOL_TOPIC[group.labelKey] ?? "workplace"],
        formats: [format],
        estimatedMinutes: gated ? 10 : format === "worksheet" ? 12 : 8,
        storageMode: gated
          ? "officer-hub" as const
          : slug === "bylaw-builder" || slug === "proposal-tracker"
            ? "on-device-hub-optional" as const
            : "on-device" as const,
        authRequirement: gated ? "signed-in" as const : "public" as const,
        ...(gated ? { featureGate: "officerHubPublic" as const } : {}),
        relatedItemIds: [],
      } satisfies PublicCatalogItem;
    }),
  );

  items.unshift({
    id: "create-brand-kit",
    kind: "tool",
    canonicalPath: "/create/brand-kit",
    legacyPaths: ["/brand-kit"],
    titleKey: "brandKit",
    titleNamespace: "nav",
    summaryKey: "brandKitSummary",
    summaryNamespace: "publicCatalog",
    deliverableKey: "brand-kit",
    searchTermsKey: "brand-kit",
    audiences: ["comms", "officer"],
    topics: ["brand"],
    formats: ["maker"],
    estimatedMinutes: 10,
    storageMode: "on-device",
    authRequirement: "public",
    relatedItemIds: ["learn-first-week"],
  });
  return items;
}

function guideKind(group: GuideGroupId, entry: GuideRegistryEntry): PublicCatalogKind {
  if (group === "workshops") return "workshop";
  if (entry.href === "/guide/officer-learning") return "course";
  if (["bargaining", "training", "floor", "local"].includes(group)) {
    return "playbook";
  }
  return "guide";
}

function guideFormat(kind: PublicCatalogKind): PublicCatalogFormat {
  if (kind === "workshop") return "workshop";
  if (kind === "course") return "course";
  if (kind === "playbook") return "playbook";
  return "playbook";
}

function guideTopics(group: GuideGroupId): PublicCatalogTopic[] {
  if (group === "channels") return ["web", "social"];
  if (group === "bargaining") return ["bargaining"];
  if (group === "training") return ["training"];
  if (group === "floor") return ["workplace", "grievances"];
  if (group === "local") return ["governance"];
  if (group === "workshops") return ["workshops"];
  return ["social"];
}

function guideItems(): PublicCatalogItem[] {
  return GUIDE_CATALOG_GROUP_IDS.flatMap((group) =>
    GUIDE_REGISTRY[group].map((entry) => {
      const kind = guideKind(group, entry);
      const titleKey = (entry.navKey ?? "guide") as NavLinkKey;
      return {
        id: catalogId(canonicalPublicPath(entry.href)),
        kind,
        canonicalPath: canonicalPublicPath(entry.href),
        legacyPaths: [entry.href],
        titleKey,
        titleNamespace: "nav",
        summaryKey: entry.key,
        summaryNamespace: "guidesIndex",
        deliverableKey:
          kind === "workshop"
            ? "facilitator-run-sheet"
            : kind === "course"
              ? "learning-module"
              : "guide-checklists",
        ...(entry.href === "/guide/social-media-plan"
          ? { searchTermsKey: "first-week" }
          : entry.href === "/guide/steward-playbooks"
            ? { searchTermsKey: "steward-path" }
            : entry.href === "/guide/officer-learning"
              ? { searchTermsKey: "officer-learning" }
              : entry.href === "/guide/running-meetings"
                ? { searchTermsKey: "running-meetings" }
                : entry.href === "/guide/grievance-process"
                  ? { searchTermsKey: "grievances" }
                  : {}),
        audiences:
          kind === "course"
            ? ["steward", "officer"]
            : group === "channels" || group === "commsPath"
              ? ["comms", "officer"]
              : ["steward", "officer"],
        topics: guideTopics(group),
        formats: [guideFormat(kind)],
        estimatedMinutes:
          kind === "workshop" ? 60 : kind === "course" ? 30 : 15,
        storageMode: kind === "course" ? "on-device" : "none",
        authRequirement: "public",
        relatedItemIds: [],
      } satisfies PublicCatalogItem;
    }),
  );
}

function libraryItems(): PublicCatalogItem[] {
  const rows = [
    { path: "/examples", key: "socialExamples", summaryKey: "examplesSummary", topic: "social" },
    { path: "/captions", key: "captions", summaryKey: "captionsSummary", topic: "social" },
    { path: "/assets", key: "assets", summaryKey: "assetsSummary", topic: "brand" },
  ] as const;
  return rows.map((row) => ({
    id: catalogId(canonicalPublicPath(row.path)),
    kind: "library",
    canonicalPath: canonicalPublicPath(row.path),
    legacyPaths: [row.path],
    titleKey: row.key,
    titleNamespace: "nav",
    summaryKey: row.summaryKey,
    summaryNamespace: "publicCatalog",
    deliverableKey:
      row.path === "/examples"
        ? "communications-examples"
        : "reference-library",
    ...(row.path === "/examples"
      ? { searchTermsKey: "communications-examples" }
      : row.path === "/captions"
        ? { searchTermsKey: "captions" }
        : {}),
    audiences: ["comms", "steward"],
    topics: [row.topic],
    formats: ["library"],
    estimatedMinutes: 5,
    storageMode: "none",
    authRequirement: "public",
    relatedItemIds: [],
  }));
}

const MODULE_TOPIC: Record<string, PublicCatalogTopic> = {
  "contract-enforcement": "grievances",
  "progressive-discipline": "workplace",
  "human-rights-accommodation": "accessibility",
  "democratic-governance": "governance",
  "financial-health": "governance",
  "building-collective-power": "bargaining",
  "mobilizer-bargaining-partner": "bargaining",
  "advanced-grievance-settlement": "grievances",
  "benefits-disability-claims": "workplace",
  "joint-workplace-committees": "safety",
  "membership-lists-privacy": "governance",
  "advanced-local-finance": "governance",
  "digital-security-transitions": "accessibility",
  "everyday-union-value": "workplace",
  "duty-of-fair-representation": "grievances",
  "seniority-bumping-layoff": "workplace",
  "pdf-classification": "workplace",
};

function officerLearningModuleItems(): PublicCatalogItem[] {
  return OFFICER_LEARNING_MODULES.map((module) => {
    const legacyPath = `/guide/officer-learning/${module.slug}`;
    return {
      id: catalogId(canonicalPublicPath(legacyPath)),
      kind: "course",
      canonicalPath: canonicalPublicPath(legacyPath),
      legacyPaths: [legacyPath],
      titleKey: module.slug,
      titleNamespace: "officerLearning",
      summaryKey: module.slug,
      summaryNamespace: "officerLearning",
      deliverableKey: "learning-module",
      searchTermsKey: "officer-learning",
      audiences: ["steward", "officer"],
      topics: [MODULE_TOPIC[module.slug] ?? "training"],
      formats: ["course"],
      estimatedMinutes: module.readingMinutes,
      storageMode: "on-device",
      authRequirement: "public",
      relatedItemIds: [],
    } satisfies PublicCatalogItem;
  });
}

const RELATED_ITEM_IDS: Readonly<Record<string, readonly string[]>> = {
  "create-brand-kit": [
    "learn-communications-blueprint",
    "learn-first-week",
    "learn-library-brand-assets",
  ],
  "create-logo-builder": ["create-brand-kit", "learn-library-brand-assets"],
  "create-resizer": ["create-graphic-maker", "learn-short-form"],
  "create-document-generator": ["learn-membership-signup", "learn-workshops-comms"],
  "create-board-banner": ["learn-union-boards", "learn-print"],
  "create-board-notice": ["learn-union-boards", "learn-print"],
  "create-solidarity-poster": ["learn-union-boards", "learn-strike"],
  "create-qr-board": ["learn-union-boards", "learn-membership-signup"],
  "create-org-chart": ["learn-union-boards", "create-website-template"],
  "create-flyer-maker": ["learn-print", "learn-first-week"],
  "create-qr-card": ["learn-membership-signup", "create-qr-board"],
  "create-action-card": ["learn-first-week", "learn-strike"],
  "create-pulse-poll": ["learn-workshops-comms", "learn-first-week"],
  "create-graphic-maker": ["learn-library-examples", "learn-short-form"],
  "create-quote-card": ["learn-library-examples", "create-graphic-maker"],
  "create-meeting-background": ["learn-workshops-comms", "learn-photo-consent"],
  "create-website-template": ["learn-website", "learn-library-brand-assets"],
  "create-alt-text": ["learn-photo-consent", "learn-library-examples"],
  "create-rtw-accommodation": ["learn-right-to-refuse", "learn-grievance-process"],
  "create-pre-disciplinary-log": ["learn-grievance-process", "learn-dfr"],
  "create-complaint-vs-grievance": ["learn-grievance-process", "learn-dfr"],
  "create-bylaw-builder": ["learn-bylaws", "learn-running-meetings"],
  "create-proposal-tracker": ["learn-bargaining", "learn-workshops-comms"],
  "create-rules-of-order": ["learn-running-meetings", "learn-bylaws"],
  "learn-first-week": ["create-brand-kit", "learn-communications-blueprint", "create-graphic-maker"],
  "learn-communications-blueprint": ["learn-first-week", "learn-workshops-comms"],
  "learn-steward": ["learn-grievance-process", "learn-right-to-refuse", "learn-running-meetings"],
  "learn-officer": ["learn-bylaws", "learn-running-meetings", "create-bylaw-builder"],
  "learn-workshops-comms": ["learn-library-examples", "create-brand-kit", "learn-communications-blueprint"],
  "learn-grievance-process": ["create-complaint-vs-grievance", "create-pre-disciplinary-log", "learn-dfr"],
  "learn-running-meetings": ["create-rules-of-order", "learn-bylaws"],
};

export const PUBLIC_CATALOG: readonly PublicCatalogItem[] = [
  ...toolItems(),
  ...guideItems(),
  ...officerLearningModuleItems(),
  ...libraryItems(),
].map((item) => ({
  ...item,
  relatedItemIds: RELATED_ITEM_IDS[item.id] ?? item.relatedItemIds,
}));

export const PUBLIC_CATALOG_BY_ID: ReadonlyMap<string, PublicCatalogItem> =
  new Map(PUBLIC_CATALOG.map((item) => [item.id, item]));

export function publicCatalogItemForPath(path: string): PublicCatalogItem | undefined {
  const canonicalPath = canonicalPublicPath(path);
  return PUBLIC_CATALOG.find((item) => item.canonicalPath === canonicalPath);
}

export function visiblePublicCatalog(options: {
  audience?: PublicCatalogAudience;
  authenticated: boolean;
  officerHubPublic: boolean;
  disabledToolSlugs?: readonly string[];
  /** Brand Kit preset — hides union-specific guides (e.g. OPSEU bargaining). */
  unionPresetId?: string | null;
  hiddenGuidePaths?: readonly string[];
}): PublicCatalogItem[] {
  const disabled = new Set(options.disabledToolSlugs ?? []);
  const hiddenGuides = new Set(
    options.hiddenGuidePaths
      ?? hiddenGuidePathsForPreset(options.unionPresetId),
  );
  return PUBLIC_CATALOG.filter((item) => {
    if (options.audience && !item.audiences.includes(options.audience)) return false;
    if (item.authRequirement === "signed-in" && !options.authenticated) return false;
    if (item.featureGate === "officerHubPublic" && !options.officerHubPublic) return false;
    const oldToolPath = item.legacyPaths.find((path) => path.startsWith("/tools/"));
    if (oldToolPath && disabled.has(oldToolPath.slice("/tools/".length))) return false;
    if (hiddenGuides.has(item.canonicalPath)) return false;
    if ([...hiddenGuides].some((path) => item.legacyPaths.includes(path))) return false;
    return true;
  });
}

export function catalogPaths(): string[] {
  return PUBLIC_CATALOG.map((item) => item.canonicalPath);
}

export function relatedCatalogItems(item: PublicCatalogItem): PublicCatalogItem[] {
  return item.relatedItemIds
    .map((id) => PUBLIC_CATALOG_BY_ID.get(id))
    .filter((related): related is PublicCatalogItem => Boolean(related));
}
