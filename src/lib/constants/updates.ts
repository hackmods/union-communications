/**
 * Public "What's new" catalog — steward-facing growth notes, not an
 * engineering changelog. Copy lives in `messages/*.json` under `updates.items`.
 * When you ship a steward-facing change, prepend here + EN/FR copy in the
 * same change. Rule: `.cursor/rules/whats-new.mdc`.
 */

export const UPDATE_KINDS = ["added", "improved", "guide"] as const;

export type UpdateKind = (typeof UPDATE_KINDS)[number];

export type UpdateAudience = "comms" | "hub";

export type UpdateEntry = {
  id: string;
  /** Calendar day as `YYYY-MM-DD`. Grouping uses the year-month prefix. */
  date: string;
  kind: UpdateKind;
  /** Default `comms`. Hub notes hide unless Officer Hub is advertised. */
  audience?: UpdateAudience;
  /** In-app path to the tool or guide, when there is one to open. */
  href?: string;
};

export const UPDATES: readonly UpdateEntry[] = [
  {
    id: "board-notice-layouts",
    date: "2026-08-26",
    kind: "improved",
    href: "/tools/board-notice",
  },
  {
    id: "workplace-mapping-guide",
    date: "2026-08-26",
    kind: "guide",
    href: "/guide/workplace-mapping",
  },
  {
    id: "steward-101-guide",
    date: "2026-08-26",
    kind: "guide",
    href: "/guide/steward-101",
  },
  {
    id: "grievance-process-guide",
    date: "2026-08-26",
    kind: "guide",
    href: "/guide/grievance-process",
  },
  {
    id: "assets-pwa-download",
    date: "2026-08-24",
    kind: "improved",
    href: "/assets",
  },
  {
    id: "labour-guides-rewrite",
    date: "2026-08-24",
    kind: "guide",
    href: "/guide/resources",
  },
  {
    id: "graphic-gradient-ink",
    date: "2026-08-24",
    kind: "improved",
    href: "/examples",
  },
  {
    id: "federation-sources",
    date: "2026-08-24",
    kind: "improved",
    href: "/guide/resources",
  },
  {
    id: "caat-s-gold-plate",
    date: "2026-08-24",
    kind: "improved",
    href: "/brand-kit",
  },
  {
    id: "joint-committee-guide",
    date: "2026-08-23",
    kind: "guide",
    href: "/guide/joint-committee",
  },
  {
    id: "portal-union-circles",
    date: "2026-08-23",
    kind: "added",
    audience: "hub",
    href: "/portal",
  },
  {
    id: "org-chart-directory",
    date: "2026-08-23",
    kind: "improved",
    href: "/tools/org-chart",
  },
  {
    id: "caat-s-look",
    date: "2026-08-21",
    kind: "added",
    href: "/brand-kit",
  },
  {
    id: "org-chart",
    date: "2026-08-20",
    kind: "added",
    href: "/tools/org-chart",
  },
  {
    id: "caat-support-collection",
    date: "2026-08-20",
    kind: "improved",
    href: "/brand-kit",
  },
  {
    id: "website-config-roundtrip",
    date: "2026-08-20",
    kind: "added",
    href: "/tools/website-template",
  },
  {
    id: "quote-card-formats",
    date: "2026-08-19",
    kind: "improved",
    href: "/tools/quote-card",
  },
  {
    id: "portal-solidarity-names",
    date: "2026-08-19",
    kind: "improved",
    audience: "hub",
    href: "/portal",
  },
  {
    id: "comms-stay-free",
    date: "2026-08-19",
    kind: "improved",
    href: "/manifesto",
  },
  {
    id: "photo-consent-howto",
    date: "2026-08-19",
    kind: "guide",
    href: "/guide/photo-consent",
  },
  {
    id: "email-outreach-howto",
    date: "2026-08-19",
    kind: "guide",
    href: "/guide/email-broadcast",
  },
  {
    id: "opseu-membership-sector",
    date: "2026-08-19",
    kind: "improved",
    href: "/brand-kit",
  },
  {
    id: "graphic-portrait",
    date: "2026-08-18",
    kind: "added",
    href: "/tools/graphic-maker",
  },
  {
    id: "short-form-guide",
    date: "2026-08-18",
    kind: "guide",
    href: "/guide/short-form",
  },
  {
    id: "website-wordpress",
    date: "2026-08-18",
    kind: "added",
    href: "/tools/website-template",
  },
  {
    id: "website-hero-art",
    date: "2026-08-18",
    kind: "improved",
    href: "/tools/website-template",
  },
  {
    id: "print-guide-howto",
    date: "2026-08-18",
    kind: "guide",
    href: "/guide/print",
  },
  {
    id: "workshop-hour",
    date: "2026-08-18",
    kind: "guide",
    href: "/guide/workshop",
  },
  {
    id: "collection-profiles",
    date: "2026-08-17",
    kind: "improved",
    href: "/brand-kit",
  },
  {
    id: "site-feedback",
    date: "2026-08-17",
    kind: "added",
    href: "/feedback",
  },
  {
    id: "brand-fonts",
    date: "2026-08-15",
    kind: "improved",
    href: "/brand-kit",
  },
  {
    id: "flyer-layouts",
    date: "2026-08-14",
    kind: "improved",
    href: "/tools/flyer-maker",
  },
  {
    id: "local-portal",
    date: "2026-08-08",
    kind: "added",
    audience: "hub",
    href: "/portal",
  },
  {
    id: "visual-system",
    date: "2026-08-06",
    kind: "improved",
    href: "/brand-kit",
  },
  {
    id: "brand-assets-unions",
    date: "2026-07-31",
    kind: "added",
    href: "/assets",
  },
  {
    id: "seniority-worksheet",
    date: "2026-07-26",
    kind: "added",
    href: "/tools/document-generator",
  },
  {
    id: "rtr-pocket-card",
    date: "2026-07-26",
    kind: "added",
    href: "/tools/qr-card",
  },
  {
    id: "email-outreach-guide",
    date: "2026-07-26",
    kind: "guide",
    href: "/guide/email-broadcast",
  },
  {
    id: "first-week-print",
    date: "2026-07-24",
    kind: "improved",
    href: "/guide/social-media-plan",
  },
];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isUpdateKind(value: string): value is UpdateKind {
  return (UPDATE_KINDS as readonly string[]).includes(value);
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function parseUpdateDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0);
}

function dateLocale(locale: string): string {
  return locale === "fr" ? "fr-CA" : "en-CA";
}

export function formatUpdateDate(isoDate: string, locale: string): string {
  return parseUpdateDate(isoDate).toLocaleDateString(dateLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Month heading, first letter capitalized so French `août` still reads as a title. */
export function formatUpdateMonth(yearMonth: string, locale: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const loc = dateLocale(locale);
  const formatted = new Date(year, (month ?? 1) - 1, 1, 12, 0, 0).toLocaleDateString(
    loc,
    { month: "long", year: "numeric" },
  );
  return formatted.charAt(0).toLocaleUpperCase(loc) + formatted.slice(1);
}

export function visibleUpdates(options: {
  officerHubPublic: boolean;
}): UpdateEntry[] {
  return UPDATES.filter(
    (entry) => entry.audience !== "hub" || options.officerHubPublic,
  );
}

export function filterUpdates(
  entries: readonly UpdateEntry[],
  kind: UpdateKind | "all",
): UpdateEntry[] {
  if (kind === "all") return [...entries];
  return entries.filter((entry) => entry.kind === kind);
}

export type UpdateMonthGroup = {
  month: string;
  entries: UpdateEntry[];
};

export function groupUpdatesByMonth(
  entries: readonly UpdateEntry[],
): UpdateMonthGroup[] {
  const groups: UpdateMonthGroup[] = [];
  for (const entry of entries) {
    const month = monthKey(entry.date);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.entries.push(entry);
    else groups.push({ month, entries: [entry] });
  }
  return groups;
}

/** Catalog integrity helper for tests — not used at runtime. */
export function assertUpdateCatalogShape(entries: readonly UpdateEntry[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  let previousTime = Number.POSITIVE_INFINITY;

  for (const entry of entries) {
    if (seen.has(entry.id)) errors.push(`duplicate id: ${entry.id}`);
    seen.add(entry.id);
    if (!ISO_DAY.test(entry.date)) errors.push(`${entry.id} date ${entry.date}`);
    if (!isUpdateKind(entry.kind)) errors.push(`${entry.id} kind ${entry.kind}`);
    if (entry.href && !entry.href.startsWith("/")) {
      errors.push(`${entry.id} href ${entry.href}`);
    }
    const time = parseUpdateDate(entry.date).getTime();
    if (time > previousTime) errors.push(`${entry.id} is not newest-first`);
    previousTime = time;
  }

  return errors;
}
