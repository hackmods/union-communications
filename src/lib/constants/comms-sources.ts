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
}

/** Canonical external references used across comms guides and tools. */
export const COMMS_SOURCES: Record<string, CommsSource> = {
  "opseu-branding": {
    id: "opseu-branding",
    category: "branding",
    label: "OPSEU/SEFPO graphics, logos & letterhead",
    url: "https://opseu.org/information/opseu-graphics-logos-and-letterhead-templates/12263",
    note: "Official OPSEU blue (#003DA5, Pantone 285) and logo usage rules. CAAT yellow is a campaign accent, not the primary union brand colour.",
  },
  "opseu-member-portal": {
    id: "opseu-member-portal",
    category: "union",
    label: "OPSEU/SEFPO Member Portal",
    url: "https://members.opseu.org/",
    note: "National member resources linked from local websites and crisis comms.",
  },
  "opseu-collective-agreements": {
    id: "opseu-collective-agreements",
    category: "union",
    label: "OPSEU/SEFPO collective agreements",
    url: "https://opseu.org/bargaining/collective-agreements-and-arbitration-awards/",
    note: "Public CA documents for citing contract language in comms — never post confidential bargaining details.",
  },
  "opseu-forms": {
    id: "opseu-forms",
    category: "union",
    label: "OPSEU/SEFPO forms and documents",
    url: "https://opseu.org/about-opseu-sefpo/forms-documents/",
    note: "National forms referenced in footer links on exported local websites.",
  },
  "local243-website": {
    id: "local243-website",
    category: "website",
    label: "OPSEU SEFPO Local 243 website (reference)",
    url: "https://local243.org",
    note: "Live example local site built by Local 243 volunteers. The Website Template tool is a simplified, parameterised version of this GitHub Pages site.",
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
    note: "Web Content Accessibility Guidelines — contrast checker and alt-text guidance in this toolbox target Level AA.",
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
    note: "Many CAAT Support Staff locals use a closed Facebook group as their primary member channel.",
  },
  "ofl": {
    id: "ofl",
    category: "union",
    label: "Ontario Federation of Labour",
    url: "https://ofl.ca/",
    note: "Provincial labour federation — solidarity links on local sites.",
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
  unionBoards: ["opseu-collective-agreements", "opseu-branding"],
  print: ["opseu-branding"],
  website: ["local243-website", "github-pages", "github-pages-custom-domain"],
  crisis: [
    "opseu-collective-agreements",
    "opseu-forms",
    "opseu-member-portal",
  ],
  assets: ["opseu-branding"],
  websiteTemplate: ["local243-website", "github-pages", "opseu-branding"],
  boardNotice: ["opseu-branding"],
  materials: Object.keys(COMMS_SOURCES),
};

export function getSourcesForPage(pageId: string): CommsSource[] {
  const ids = PAGE_SOURCE_IDS[pageId] ?? [];
  return ids.map((id) => COMMS_SOURCES[id]).filter(Boolean);
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
