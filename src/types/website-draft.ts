/**
 * On-device Website Template page copy. Brand colours, links, and logo stay in
 * Brand Kit; officers prefer Public Roster unless `officersOverride` is set.
 * Hero photo data URLs are session-only (too large for localStorage packs).
 */

import type { WebsiteOfficer } from "@/types/website-template";
import type { WebsiteHeroArtId } from "@/lib/templates/website/hero-art";

export const WEBSITE_DRAFT_VERSION = 1 as const;

export interface WebsiteDraft {
  version: typeof WEBSITE_DRAFT_VERSION;
  updatedAt: string;
  unionName: string;
  heroText: string;
  about1: string;
  about2: string;
  contactEmail: string;
  officeAddress: string;
  /**
   * When set, overrides Brand Kit Facebook for the site preview/export.
   * `null` / omit = follow Brand Kit.
   */
  facebookUrl?: string | null;
  /** When true, use `officers` instead of Public Roster showOnWebsite rows. */
  officersOverride: boolean;
  officers: WebsiteOfficer[];
  heroArtId: WebsiteHeroArtId;
  heroImageAlt: string;
}

export function emptyWebsiteDraft(
  partial?: Partial<Omit<WebsiteDraft, "version" | "updatedAt">>,
): WebsiteDraft {
  return {
    version: WEBSITE_DRAFT_VERSION,
    updatedAt: new Date().toISOString(),
    unionName: partial?.unionName ?? "",
    heroText: partial?.heroText ?? "",
    about1: partial?.about1 ?? "",
    about2: partial?.about2 ?? "",
    contactEmail: partial?.contactEmail ?? "",
    officeAddress: partial?.officeAddress ?? "",
    facebookUrl: partial?.facebookUrl ?? null,
    officersOverride: partial?.officersOverride ?? false,
    officers: partial?.officers ?? [],
    heroArtId: partial?.heroArtId ?? "mesh",
    heroImageAlt: partial?.heroImageAlt ?? "",
  };
}
