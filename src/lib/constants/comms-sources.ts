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
    url: "https://opseu.org/information/find-your-collective-agreement/12967/",
    note: "Find Your Collective Agreement — province-wide contracts. Individual employer CAs may need the Member Portal. Do not use the retired /information/general/… or bargaining/… pretty URLs.",
    unionIds: OPSEU_SCOPE,
    lastVerified: "2026-08-24",
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
  "opseu-eerc-minutes": {
    id: "opseu-eerc-minutes",
    category: "union",
    label: "OPSEU / SEFPO CAAT Support EERC minutes",
    url: "https://opseu.org/information/minutes/caat-support-employee-employer-relations-committee-eerc-and-minutes/9643/",
    note: "Official union posting for CAAT Support Employee/Employer Relations Committee minutes. Numbered CMS paths move; the page may sit behind a bot check. Confirm in a browser before you share.",
    unionIds: OPSEU_SCOPE,
    lastVerified: "2026-08-23",
  },
  "cec-pteerc-minutes": {
    id: "cec-pteerc-minutes",
    category: "union",
    label: "College Employer Council part-time EERC minutes",
    url: "https://www.collegeemployercouncil.ca/resources/what-can-we-do-for-part-time-staff/part-time-support-staff-employee-employer-relations-committee--pteerc-",
    note: "Employer-council archive of part-time Support Staff EERC minutes. This is the employer posting, not a UnionOps record.",
    unionIds: OPSEU_SCOPE,
    lastVerified: "2026-08-24",
  },
  "cec-fteerc-minutes": {
    id: "cec-fteerc-minutes",
    category: "union",
    label: "College Employer Council full-time EERC minutes",
    url: "https://www.collegeemployercouncil.ca/resources/what-can-we-do-for-full-time-staff/full-time-support-staff-employee-employer-relations-committee--fteerc",
    note: "Employer-council archive of full-time Support Staff EERC minutes. Pair with the union-side OPSEU / SEFPO EERC minutes source.",
    unionIds: OPSEU_SCOPE,
    lastVerified: "2026-08-24",
  },
  "local243-website": {
    id: "local243-website",
    category: "website",
    label: "OPSEU / SEFPO Local 243 website (reference)",
    url: "https://opseu243.org/",
    note: "Live example local site built by Local 243 volunteers (local243.org redirects here). The Website Template tool is a simplified, parameterised version of this GitHub Pages site.",
    unionIds: OPSEU_SCOPE,
    lastVerified: "2026-08-24",
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
    url: "https://www.ontario.ca/page/accessibility-in-ontario",
    note: "Ontario accessibility hub (accessibility-laws redirects here). Referenced in the hub accessibility statement.",
    lastVerified: "2026-08-24",
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
    note: "Provincial labour federation — solidarity and movement education; cite, do not mirror.",
    lastVerified: "2026-08-24",
  },
  "nupge": {
    id: "nupge",
    category: "union",
    label: "National Union of Public and General Employees (NUPGE)",
    url: "https://nupge.ca/",
    note: "National affiliate federation — solidarity links on local sites; cite, do not mirror.",
    lastVerified: "2026-08-24",
  },
  "clc": {
    id: "clc",
    category: "union",
    label: "Canadian Labour Congress",
    url: "https://canadianlabour.ca/",
    note: "National labour congress — solidarity links on local sites; cite, do not mirror.",
    lastVerified: "2026-08-24",
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
  "ontario-lra-s74": {
    id: "ontario-lra-s74",
    category: "union",
    label: "Labour Relations Act, 1995 (Ontario)",
    url: "https://www.ontario.ca/laws/statute/95l01",
    note: "Ontario LRA s.74 sets the duty of fair representation (arbitrary, discriminatory, bad faith). College CAAT units may use the CCBA instead — confirm which act applies.",
    lastVerified: "2026-08-24",
  },
  "ontario-ccba": {
    id: "ontario-ccba",
    category: "union",
    label: "Colleges Collective Bargaining Act, 2008 (Ontario)",
    url: "https://www.ontario.ca/laws/statute/08c23",
    note: "Governs Ontario college-sector bargaining. DFR for CAAT support staff is in this Act, not the LRA.",
    lastVerified: "2026-08-24",
  },
  "olrb-dfr-meaning": {
    id: "olrb-dfr-meaning",
    category: "union",
    label: "OLRB Information Bulletin 12 — What does DFR mean?",
    url: "https://www.olrb.gov.on.ca/Forms/IB/InformationBulletin-12-EN.pdf",
    note: "Plain-language OLRB explainer for members. Stewards use this to understand the test — not to coach filing against the union.",
    lastVerified: "2026-08-24",
  },
  "olrb-dfr-applications": {
    id: "olrb-dfr-applications",
    category: "union",
    label: "OLRB Information Bulletin 11 — DFR applications",
    url: "https://www.olrb.gov.on.ca/Forms/IB/InformationBulletin-11-EN.pdf",
    note: "How members file a DFR application at the OLRB — know the process so you can run a clean representation file.",
    lastVerified: "2026-08-24",
  },
  "clc-s37": {
    id: "clc-s37",
    category: "union",
    label: "Canada Labour Code — s.37 (duty of fair representation)",
    url: "https://laws-lois.justice.gc.ca/eng/acts/l-2/page-5.html",
    note: "Federal-sector units — CIRB handles complaints; same arbitrary / discriminatory / bad faith language.",
    lastVerified: "2026-08-24",
  },
  "ontario-ohsa-refusal-guide": {
    id: "ontario-ohsa-refusal-guide",
    category: "union",
    label: "OHSA Part V — right to refuse (Ontario guide)",
    url: "https://www.ontario.ca/document/guide-occupational-health-and-safety-act/part-v-right-refuse-or-stop-work-where-health-and-safety-danger",
    note: "Ministry plain-language walkthrough of stage 1 employer investigation and stage 2 ministry inspector.",
    lastVerified: "2026-08-24",
  },
  "ipc-video-surveillance": {
    id: "ipc-video-surveillance",
    category: "accessibility",
    label: "IPC Ontario — Guidelines for the use of video surveillance",
    url: "https://www.ipc.on.ca/en/resources-and-decisions/guidelines-use-video-surveillance",
    note: "Privacy principles for capturing identifiable images in workplaces and public spaces — pair with member consent practice.",
    lastVerified: "2026-08-24",
  },
  "pipeda-consent": {
    id: "pipeda-consent",
    category: "accessibility",
    label: "PIPEDA — consent and personal information (Canada)",
    url: "https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda_brief/",
    note: "Federal privacy baseline when employers or vendors collect member images — consent must be meaningful.",
    lastVerified: "2026-08-24",
  },
};

/** Which sources to cite on each guide or tool page. */
export const PAGE_SOURCE_IDS: Record<string, string[]> = {
  blueprint: [
    "opseu-branding",
    "wcag-21",
    "facebook-groups",
    "instagram-reels",
    "ofl",
    "nupge",
    "clc",
  ],
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
    "ofl",
    "nupge",
    "clc",
  ],
  print: [
    "opseu-branding",
    "ontario-required-posters",
    "ontario-esa-poster",
    "wcag-21",
    "facebook-groups",
  ],
  emailBroadcast: [
    "opseu-branding",
    "opseu-forms",
    "opseu-member-portal",
    "wcag-21",
    "facebook-groups",
  ],
  workshop: [
    "opseu-branding",
    "local243-website",
    "github-pages",
    "facebook-groups",
    "wcag-21",
  ],
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
    "ofl",
    "nupge",
    "clc",
  ],
  photoConsent: [
    "ipc-video-surveillance",
    "pipeda-consent",
    "opseu-collective-agreements",
  ],
  dfr: [
    "ontario-lra-s74",
    "ontario-ccba",
    "olrb-dfr-meaning",
    "olrb-dfr-applications",
    "clc-s37",
  ],
  grievanceProcess: [
    "opseu-collective-agreements",
    "ontario-ccba",
    "ontario-lra-s74",
  ],
  seniority: ["opseu-collective-agreements", "ontario-ccba"],
  jointCommittee: [
    "opseu-collective-agreements",
    "opseu-eerc-minutes",
    "cec-pteerc-minutes",
    "cec-fteerc-minutes",
  ],
  rightToRefuse: [
    "ontario-ohsa",
    "ontario-ohsa-refusal-guide",
    "ontario-required-posters",
  ],
  membershipSignup: ["ofl", "nupge", "clc", "opseu-member-portal", "opseu-forms"],
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

/** Universal federation links in the website ZIP “Rights & Partners” column. */
export const WEBSITE_RIGHTS_PARTNERS_FEDERATION_SOURCE_IDS = [
  "ofl",
  "nupge",
  "clc",
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

export function getWebsiteRightsPartnersFederationSources(): CommsSource[] {
  return WEBSITE_RIGHTS_PARTNERS_FEDERATION_SOURCE_IDS.map(
    (id) => COMMS_SOURCES[id],
  ).filter(Boolean);
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
