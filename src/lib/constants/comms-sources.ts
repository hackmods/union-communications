export type CommsSourceCategory =
  | "branding"
  | "website"
  | "accessibility"
  | "union"
  | "platform";

export interface CommsSource {
  id: string;
  category: CommsSourceCategory;
  label: string;
  url: string;
  note: string;
  /**
   * Brand Kit `unionPresetId` values this citation applies to.
   * Omit or empty = universal (all unions).
   * When Brand Kit has no preset yet, OPSEU-scoped sources still show
   * (reference-tenant / workshop default) — see `sourceMatchesUnion`.
   */
  unionIds?: readonly string[];
  /** ISO date (YYYY-MM-DD) when a steward or agent last confirmed the URL in a browser. */
  lastVerified?: string;
}

const OPSEU_SCOPE = ["opseu"] as const;

/** Canonical external references used across comms guides and tools. */
export const COMMS_SOURCES: Record<string, CommsSource> = {
  "opseu-branding": {
    id: "opseu-branding",
    category: "branding",
    label: "OPSEU / SEFPO graphics, logos & letterhead",
    url: "https://opseu.org/about-opseu-sefpo/",
    note: "National About hub. Graphics downloads move when the national site reorganizes — Brand Assets on this site mirrors logos and colour specs.",
    unionIds: OPSEU_SCOPE,
    lastVerified: "2026-08-23",
  },
  "opseu-home": {
    id: "opseu-home",
    category: "union",
    label: "OPSEU / SEFPO",
    url: "https://opseu.org/",
    note: "National union homepage — exported local website footer.",
    unionIds: OPSEU_SCOPE,
    lastVerified: "2026-08-23",
  },
  "opseu-contact": {
    id: "opseu-contact",
    category: "union",
    label: "OPSEU / SEFPO Head Office",
    url: "https://opseu.org/contact-us/",
    note: "National Contact Us page (Head Office and regional offices). The /contact/ slug is not the live page.",
    unionIds: OPSEU_SCOPE,
    lastVerified: "2026-08-23",
  },
  "opseu-member-portal": {
    id: "opseu-member-portal",
    category: "union",
    label: "OPSEU / SEFPO Member Portal",
    url: "https://members.opseu.org/",
    note: "National member resources linked from local websites and crisis comms.",
    unionIds: OPSEU_SCOPE,
    lastVerified: "2026-08-23",
  },
  "opseu-collective-agreements": {
    id: "opseu-collective-agreements",
    category: "union",
    label: "OPSEU / SEFPO collective agreements",
    url: "https://opseu.org/information/general/find-your-collective-agreement/12967/",
    note: "Find Your Collective Agreement — province-wide contracts. Individual employer CAs may need the Member Portal. Numbered CMS paths move.",
    unionIds: OPSEU_SCOPE,
    lastVerified: "2026-08-23",
  },
  "opseu-forms": {
    id: "opseu-forms",
    category: "union",
    label: "OPSEU / SEFPO forms and documents",
    url: "https://opseu.org/opseu-members-tools-and-resources/",
    note: "Members tools hub lists current forms. Deep Forms and Documents pages move when the national site reorganizes.",
    unionIds: OPSEU_SCOPE,
    lastVerified: "2026-08-23",
  },
  "local243-website": {
    id: "local243-website",
    category: "website",
    label: "OPSEU / SEFPO Local 243 website (reference)",
    url: "https://local243.org",
    note: "Live example local site built by Local 243 volunteers. The Website Template tool is a simplified, parameterised version of this GitHub Pages site.",
    unionIds: OPSEU_SCOPE,
  },
  "github-pages": {
    id: "github-pages",
    category: "platform",
    label: "GitHub Pages documentation",
    url: "https://docs.github.com/en/pages",
    note: "Free static site hosting used by the exported website ZIP. No server or database required.",
  },
  "github-pages-custom-domain": {
    id: "github-pages-custom-domain",
    category: "platform",
    label: "GitHub Pages custom domains",
    url: "https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site",
    note: "Optional step to point a domain like local243.org at a GitHub Pages repo.",
  },
  "wcag-21": {
    id: "wcag-21",
    category: "accessibility",
    label: "WCAG 2.1 (W3C)",
    url: "https://www.w3.org/TR/WCAG21/",
    note: "Web Content Accessibility Guidelines - contrast checker and alt-text guidance in this toolbox target Level AA.",
  },
  "aoda": {
    id: "aoda",
    category: "accessibility",
    label: "Accessibility for Ontarians with Disabilities Act (AODA)",
    url: "https://www.ontario.ca/page/accessibility-laws",
    note: "Ontario accessibility law referenced in the hub accessibility statement.",
  },
  "facebook-groups": {
    id: "facebook-groups",
    category: "platform",
    label: "Facebook Groups (local comms channel)",
    url: "https://www.facebook.com/help/groups",
    note: "Many locals use a closed Facebook group as their primary member channel.",
  },
  "instagram-reels": {
    id: "instagram-reels",
    category: "platform",
    label: "Record a Reel on Instagram",
    url: "https://help.instagram.com/2720958398006062/",
    note: "Official Instagram help for recording and sharing Reels. Length limits change; read the live page, not a blog recap.",
    lastVerified: "2026-08-18",
  },
  "youtube-shorts": {
    id: "youtube-shorts",
    category: "platform",
    label: "Get started creating YouTube Shorts",
    url: "https://support.google.com/youtube/answer/10059070",
    note: "Official YouTube Help for Shorts. Vertical clips; do not treat ranking tips from third-party blogs as durable.",
    lastVerified: "2026-08-18",
  },
  "ofl": {
    id: "ofl",
    category: "union",
    label: "Ontario Federation of Labour",
    url: "https://ofl.ca/",
    note: "Provincial labour federation - solidarity links on local sites.",
  },
  "ontario-required-posters": {
    id: "ontario-required-posters",
    category: "union",
    label: "Posters required in the workplace (Ontario)",
    url: "https://www.ontario.ca/page/posters-required-workplace",
    note: "Ministry hub for ESA and other workplace posters locals can print when a board needs content.",
  },
  "ontario-esa-poster": {
    id: "ontario-esa-poster",
    category: "union",
    label: "Employment Standards Act - mandatory information",
    url: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/mandatory-information-employees",
    note: "Official ESA poster distribution rules; printable PDF mirrored under public/assets/ontario-board-posters/.",
  },
  "ontario-ohsa": {
    id: "ontario-ohsa",
    category: "union",
    label: "Occupational Health and Safety Act (e-Laws)",
    url: "https://www.ontario.ca/laws/statute/90o01",
    note: "Live OHSA statute - prefer QR to e-Laws over outdated paper copies on union boards.",
  },
};

/** Which sources to cite on each guide or tool page. */
export const PAGE_SOURCE_IDS: Record<string, string[]> = {
  blueprint: ["opseu-branding", "wcag-21", "facebook-groups"],
  socialMediaPlan: [
    "opseu-branding",
    "local243-website",
    "github-pages",
    "facebook-groups",
  ],
  unionBoards: [
    "opseu-collective-agreements",
    "opseu-branding",
    "ontario-required-posters",
    "ontario-esa-poster",
    "ontario-ohsa",
  ],
  print: ["opseu-branding"],
  emailBroadcast: ["opseu-branding"],
  shortForm: [
    "facebook-groups",
    "instagram-reels",
    "youtube-shorts",
    "wcag-21",
    "aoda",
  ],
  website: ["local243-website", "github-pages", "github-pages-custom-domain"],
  crisis: [
    "opseu-collective-agreements",
    "opseu-forms",
    "opseu-member-portal",
  ],
  photoConsent: ["wcag-21", "aoda", "opseu-collective-agreements"],
  dfr: ["opseu-collective-agreements", "opseu-forms", "opseu-member-portal"],
  seniority: ["opseu-collective-agreements"],
  rightToRefuse: ["ontario-ohsa", "ontario-required-posters"],
  assets: ["opseu-branding"],
  websiteTemplate: ["local243-website", "github-pages", "opseu-branding"],
  boardNotice: ["opseu-branding"],
  boardBanner: ["opseu-branding"],
  resources: Object.keys(COMMS_SOURCES),
};

/** Reference-tenant website ZIP footer when `includeOpseuResources` is true. */
export const OPSEU_WEBSITE_FOOTER_SOURCE_IDS = [
  "opseu-home",
  "opseu-member-portal",
  "opseu-forms",
  "opseu-collective-agreements",
  "opseu-contact",
] as const;

/**
 * Whether a registry row applies to the current Brand Kit union preset.
 * - No `unionIds` → universal.
 * - Empty / unset preset → reference tenant (OPSEU-scoped still visible).
 * - Other preset → only matching `unionIds` or universal.
 */
export function sourceMatchesUnion(
  source: CommsSource,
  unionPresetId?: string | null,
): boolean {
  const scope = source.unionIds;
  if (!scope || scope.length === 0) return true;
  const preset = unionPresetId?.trim();
  if (!preset) return scope.includes("opseu");
  return scope.includes(preset);
}

/** True when the bundled OPSEU/CAAT asset pack UI should show. */
export function isReferenceAssetPackVisible(
  unionPresetId?: string | null,
): boolean {
  const preset = unionPresetId?.trim();
  return !preset || preset === "opseu";
}

export function filterSourcesByUnion(
  sources: CommsSource[],
  unionPresetId?: string | null,
): CommsSource[] {
  return sources.filter((s) => sourceMatchesUnion(s, unionPresetId));
}

export function getOpseuWebsiteFooterSources(): CommsSource[] {
  return OPSEU_WEBSITE_FOOTER_SOURCE_IDS.map((id) => COMMS_SOURCES[id]).filter(
    Boolean,
  );
}

export function getSourcesForPage(
  pageId: string,
  unionPresetId?: string | null,
): CommsSource[] {
  const ids = PAGE_SOURCE_IDS[pageId] ?? [];
  return ids
    .map((id) => COMMS_SOURCES[id])
    .filter(
      (source): source is CommsSource =>
        Boolean(source) && sourceMatchesUnion(source, unionPresetId),
    );
}

export function getSourcesByCategory(
  sources: CommsSource[],
): Record<CommsSourceCategory, CommsSource[]> {
  const grouped: Record<CommsSourceCategory, CommsSource[]> = {
    branding: [],
    website: [],
    accessibility: [],
    union: [],
    platform: [],
  };
  for (const source of sources) {
    grouped[source.category].push(source);
  }
  return grouped;
}
