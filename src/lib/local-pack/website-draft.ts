import { z } from "zod";
import {
  DEFAULT_WEBSITE_HERO_ART_ID,
  coerceWebsiteHeroArtId,
} from "@/lib/templates/website/hero-art";
import {
  coerceWebsiteLayoutId,
  DEFAULT_WEBSITE_LAYOUT_ID,
  WEBSITE_LAYOUT_IDS,
} from "@/lib/templates/website/layouts/registry";
import { coerceWebsiteSiteLocale } from "@/lib/templates/website/site-strings";
import {
  MAX_WEBSITE_OFFICERS,
  PUBLIC_ROSTER_GROUPS,
  PUBLIC_ROSTER_UNITS,
} from "@/types/public-roster";
import {
  WEBSITE_DRAFT_VERSION,
  emptyWebsiteDraft,
  type WebsiteDraft,
} from "@/types/website-draft";

const text = (max: number) => z.string().max(max);

const officerSchema = z.object({
  name: text(200),
  role: text(200),
  location: text(200),
  group: z.enum(PUBLIC_ROSTER_GROUPS).optional(),
  committeeName: text(200).optional(),
  unit: z.enum(PUBLIC_ROSTER_UNITS).nullable().optional(),
});

const eventSchema = z.object({
  title: text(300),
  when: text(64),
  location: text(300).optional().default(""),
  detail: text(2000).optional().default(""),
});

const draftSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]).optional(),
  updatedAt: z.string().max(64).optional(),
  unionName: text(500).optional().default(""),
  heroText: text(2000).optional().default(""),
  about1: text(8000).optional().default(""),
  about2: text(8000).optional().default(""),
  contactEmail: text(254).optional().default(""),
  officeAddress: text(2000).optional().default(""),
  contactPhone: text(64).optional().default(""),
  officeHours: text(500).optional().default(""),
  ctaLabel: text(120).optional().default(""),
  layoutId: z.enum(WEBSITE_LAYOUT_IDS).optional(),
  siteLocale: z.enum(["en", "fr"]).optional(),
  includePrivacyPage: z.boolean().optional(),
  includeSiteQr: z.boolean().optional(),
  events: z.array(eventSchema).max(24).optional().default([]),
  facebookUrl: text(2048).nullable().optional(),
  officersOverride: z.boolean().optional().default(false),
  officers: z.array(officerSchema).max(MAX_WEBSITE_OFFICERS).optional().default([]),
  heroArtId: z.string().optional(),
  heroImageAlt: text(500).optional().default(""),
});

export type WebsiteDraftParseResult =
  | { ok: true; draft: WebsiteDraft }
  | { ok: false };

export function parseWebsiteDraft(raw: unknown): WebsiteDraftParseResult {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };

  const heroArtId =
    coerceWebsiteHeroArtId(parsed.data.heroArtId) ??
    DEFAULT_WEBSITE_HERO_ART_ID;

  return {
    ok: true,
    draft: emptyWebsiteDraft({
      unionName: parsed.data.unionName,
      heroText: parsed.data.heroText,
      about1: parsed.data.about1,
      about2: parsed.data.about2,
      contactEmail: parsed.data.contactEmail,
      officeAddress: parsed.data.officeAddress,
      contactPhone: parsed.data.contactPhone,
      officeHours: parsed.data.officeHours,
      ctaLabel: parsed.data.ctaLabel,
      layoutId: coerceWebsiteLayoutId(
        parsed.data.layoutId ?? DEFAULT_WEBSITE_LAYOUT_ID,
      ),
      siteLocale: coerceWebsiteSiteLocale(parsed.data.siteLocale),
      includePrivacyPage: parsed.data.includePrivacyPage ?? true,
      includeSiteQr: parsed.data.includeSiteQr ?? false,
      events: parsed.data.events,
      facebookUrl: parsed.data.facebookUrl ?? null,
      officersOverride: parsed.data.officersOverride,
      officers: parsed.data.officers,
      heroArtId,
      heroImageAlt: parsed.data.heroImageAlt,
    }),
  };
}

export function stampWebsiteDraft(
  partial: Omit<WebsiteDraft, "version" | "updatedAt">,
): WebsiteDraft {
  return {
    ...partial,
    version: WEBSITE_DRAFT_VERSION,
    updatedAt: new Date().toISOString(),
  };
}
