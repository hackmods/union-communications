import { TOOL_SLUGS } from "@/lib/seo/tool-meta";

/** Hub-gated authoring — not part of public tool gate checklist. */
export const NON_GATEABLE_TOOL_SLUGS = new Set(["pulse-poll"]);

/** Public Comms tools that Site Admin can enable/disable. */
export const GATEABLE_PUBLIC_TOOL_SLUGS: readonly string[] = TOOL_SLUGS.filter(
  (slug) => !NON_GATEABLE_TOOL_SLUGS.has(slug),
);

/**
 * Maps gateable tool URL slugs → `nav.*` message keys for Site Admin labels.
 * Keep in sync with GATEABLE_PUBLIC_TOOL_SLUGS (unit-tested).
 */
export const PUBLIC_TOOL_NAV_KEY_BY_SLUG: Record<string, string> = {
  "flyer-maker": "flyerMaker",
  "graphic-maker": "graphicMaker",
  "logo-builder": "logoBuilder",
  "quote-card": "quoteCard",
  resizer: "resizer",
  "alt-text": "altText",
  "board-notice": "boardNotice",
  "board-banner": "boardBanner",
  "solidarity-poster": "solidarityPoster",
  "qr-board": "qrBoard",
  "qr-card": "qrCard",
  "action-card": "actionCard",
  "meeting-background": "meetingBackground",
  "website-template": "websiteTemplate",
  "document-generator": "documentGenerator",
  "org-chart": "orgChart",
  "local-pack": "localPack",
  "letter-generator": "letterGenerator",
  "grievance-form-builder": "grievanceFormBuilder",
  "ca-snippets": "caSnippets",
  "steward-quick-log": "stewardQuickLog",
  "rtw-accommodation": "rtwAccommodation",
  "pre-disciplinary-log": "preDisciplinaryLog",
  "complaint-vs-grievance": "complaintVsGrievance",
  "bylaw-builder": "bylawBuilder",
  "proposal-tracker": "proposalTracker",
  "rules-of-order": "rulesOfOrder",
};

export type PublicToolSettingsRecord = {
  disabledToolSlugs: string[];
  updatedById: string;
  updatedAt: string;
};

export type PublicToolResolveContext = {
  unionId?: string | null;
  localId?: string | null;
};

/**
 * Resolve whether a public tool slug is enabled.
 * Platform kill-switch wins, then union overlay, then local overlay.
 * Defaults: everything on (empty disabled lists).
 */
export function resolvePublicToolEnabled(
  slug: string,
  layers: {
    platformDisabled: readonly string[];
    unionDisabled?: readonly string[];
    localDisabled?: readonly string[];
  },
): boolean {
  if (NON_GATEABLE_TOOL_SLUGS.has(slug)) return true;
  if (layers.platformDisabled.includes(slug)) return false;
  if (layers.unionDisabled?.includes(slug)) return false;
  if (layers.localDisabled?.includes(slug)) return false;
  return true;
}

/**
 * Extract a gateable public-tool slug from a tool/create/utilities href.
 * Guides, Brand Kit, captions, etc. return null (always shown in Related footers).
 */
export function slugFromToolHref(href: string): string | null {
  const pathOnly = href.split(/[?#]/)[0] ?? href;
  const match = pathOnly.match(/^\/(?:tools|create|utilities)\/([^/]+)/);
  if (!match?.[1]) return null;
  const slug = match[1];
  if (slug === "brand-kit" || slug === "keep-learning") return null;
  if (slug === "share-kit") return "graphic-maker";
  return slug;
}
