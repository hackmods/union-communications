import { z } from "zod";
import {
  DEFAULT_WEBSITE_HERO_ART_ID,
  coerceWebsiteHeroArtId,
} from "@/lib/templates/website/hero-art";
import { MAX_WEBSITE_OFFICERS } from "@/types/public-roster";
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
});

const draftSchema = z.object({
  version: z.literal(WEBSITE_DRAFT_VERSION).optional(),
  updatedAt: z.string().max(64).optional(),
  unionName: text(500).optional().default(""),
  heroText: text(2000).optional().default(""),
  about1: text(8000).optional().default(""),
  about2: text(8000).optional().default(""),
  contactEmail: text(254).optional().default(""),
  officeAddress: text(2000).optional().default(""),
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
