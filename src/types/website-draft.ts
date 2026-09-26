/**
 * On-device Website Template page copy. Brand colours, links, and logo stay in
 * Brand Kit; officers prefer Public Roster unless `officersOverride` is set.
 * Hero photo data URLs are session-only (too large for localStorage packs).
 */

import type { WebsiteEvent, WebsiteOfficer } from "@/types/website-template";
import type { WebsiteHeroArtId } from "@/lib/templates/website/hero-art";
import type { WebsiteLayoutId } from "@/lib/templates/website/layouts/registry";
import {
  DEFAULT_WEBSITE_LAYOUT_ID,
  coerceWebsiteLayoutId,
} from "@/lib/templates/website/layouts/registry";
import type { WebsiteSiteLocale } from "@/lib/templates/website/site-strings";
import { coerceWebsiteSiteLocale } from "@/lib/templates/website/site-strings";

export const WEBSITE_DRAFT_VERSION = 2 as const;

export interface WebsiteDraft {
  version: typeof WEBSITE_DRAFT_VERSION;
  updatedAt: string;
  unionName: string;
  heroText: string;
  about1: string;
  about2: string;
  contactEmail: string;
  officeAddress: string;
  contactPhone: string;
  officeHours: string;
  ctaLabel: string;
  layoutId: WebsiteLayoutId;
  siteLocale: WebsiteSiteLocale;
  includePrivacyPage: boolean;
  includeSiteQr: boolean;
  events: WebsiteEvent[];
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
    contactPhone: partial?.contactPhone ?? "",
    officeHours: partial?.officeHours ?? "",
    ctaLabel: partial?.ctaLabel ?? "",
    layoutId: coerceWebsiteLayoutId(partial?.layoutId ?? DEFAULT_WEBSITE_LAYOUT_ID),
    siteLocale: coerceWebsiteSiteLocale(partial?.siteLocale),
    includePrivacyPage: partial?.includePrivacyPage ?? true,
    includeSiteQr: partial?.includeSiteQr ?? false,
    events: partial?.events ?? [],
    facebookUrl: partial?.facebookUrl ?? null,
    officersOverride: partial?.officersOverride ?? false,
    officers: partial?.officers ?? [],
    heroArtId: partial?.heroArtId ?? "mesh",
    heroImageAlt: partial?.heroImageAlt ?? "",
  };
}

/** Accept v1 drafts (and loose objects) and normalize to v2. */
export function migrateWebsiteDraft(raw: unknown): WebsiteDraft {
  if (!raw || typeof raw !== "object") return emptyWebsiteDraft();
  const o = raw as Record<string, unknown>;
  return emptyWebsiteDraft({
    unionName: typeof o.unionName === "string" ? o.unionName : "",
    heroText: typeof o.heroText === "string" ? o.heroText : "",
    about1: typeof o.about1 === "string" ? o.about1 : "",
    about2: typeof o.about2 === "string" ? o.about2 : "",
    contactEmail: typeof o.contactEmail === "string" ? o.contactEmail : "",
    officeAddress: typeof o.officeAddress === "string" ? o.officeAddress : "",
    contactPhone: typeof o.contactPhone === "string" ? o.contactPhone : "",
    officeHours: typeof o.officeHours === "string" ? o.officeHours : "",
    ctaLabel: typeof o.ctaLabel === "string" ? o.ctaLabel : "",
    layoutId: coerceWebsiteLayoutId(o.layoutId),
    siteLocale: coerceWebsiteSiteLocale(o.siteLocale),
    includePrivacyPage:
      typeof o.includePrivacyPage === "boolean" ? o.includePrivacyPage : true,
    includeSiteQr:
      typeof o.includeSiteQr === "boolean" ? o.includeSiteQr : false,
    events: Array.isArray(o.events)
      ? o.events
          .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
          .map((e) => ({
            title: typeof e.title === "string" ? e.title : "",
            when: typeof e.when === "string" ? e.when : "",
            location: typeof e.location === "string" ? e.location : "",
            detail: typeof e.detail === "string" ? e.detail : "",
          }))
          .filter((e) => e.title.trim())
      : [],
    facebookUrl:
      o.facebookUrl === null
        ? null
        : typeof o.facebookUrl === "string"
          ? o.facebookUrl
          : null,
    officersOverride: Boolean(o.officersOverride),
    officers: Array.isArray(o.officers)
      ? (o.officers as WebsiteOfficer[])
      : [],
    heroArtId: (typeof o.heroArtId === "string" ? o.heroArtId : "mesh") as WebsiteHeroArtId,
    heroImageAlt: typeof o.heroImageAlt === "string" ? o.heroImageAlt : "",
  });
}
