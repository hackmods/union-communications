import type { BrandKit } from "@/types/entities";
import type { PublicRoster } from "@/types/public-roster";
import type { WebsiteDraft } from "@/types/website-draft";
import type {
  WebsiteNavLink,
  WebsiteOfficer,
  WebsiteTemplateData,
} from "@/types/website-template";
import { officersFromRoster } from "@/lib/org-chart/website";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
import { resolveLocalNumber } from "@/lib/utils";
import {
  toWebsiteNavLinks,
  websiteDisplayName,
} from "@/lib/templates/website/brand-kit-fields";
import { listMembershipDestinations } from "@/lib/utils/local-links";
import type { WebsiteConfigData } from "@/lib/templates/website/website-config";
import type { WebsiteHeroArtId } from "@/lib/templates/website/hero-art";
import {
  coerceWebsiteLayoutId,
  DEFAULT_WEBSITE_LAYOUT_ID,
} from "@/lib/templates/website/layouts/registry";
import { coerceWebsiteSiteLocale } from "@/lib/templates/website/site-strings";

const LOGO_FILE_NAME = "logo.png";

export type ComposeWebsiteTemplateInput = {
  brandKit: BrandKit;
  roster: PublicRoster;
  draft: WebsiteDraft;
  /** Site-file import overlay — colours/links/officers win while present. */
  overlay?: WebsiteConfigData | null;
  logoPreviewSrc: string;
  logoFileName?: string;
  logoAlt?: string;
  heroImagePreviewSrc?: string;
  heroImageFileName?: string;
  importedHeroArtId?: WebsiteHeroArtId;
};

function resolveOfficers(
  draft: WebsiteDraft,
  roster: PublicRoster,
  overlay: WebsiteConfigData | null | undefined,
): WebsiteOfficer[] {
  if (overlay?.officers?.length) return overlay.officers;
  if (draft.officersOverride && draft.officers.length) return draft.officers;
  const fromRoster = officersFromRoster(roster);
  if (fromRoster.length) return fromRoster;
  return draft.officers;
}

/**
 * Merge Brand Kit + Public Roster + website draft (+ optional import overlay)
 * into the flat runtime model used by preview and ZIP exporters.
 */
export function composeWebsiteTemplateData(
  input: ComposeWebsiteTemplateInput,
): WebsiteTemplateData {
  const { brandKit, roster, draft, overlay } = input;
  const localNumber = overlay?.localNumber
    ? resolveLocalNumber(overlay.localNumber)
    : resolveLocalNumber(brandKit.local.localNumber);
  const canvasTokens = resolveCanvasTokens(brandKit);
  const facebookUrl = overlay
    ? overlay.facebookUrl
    : draft.facebookUrl !== null && draft.facebookUrl !== undefined
      ? draft.facebookUrl
      : (brandKit.facebookUrl?.trim() ?? "");
  const customLinks: WebsiteNavLink[] = overlay
    ? overlay.customLinks
    : toWebsiteNavLinks(brandKit.customLinks ?? []);
  const membershipLinks: WebsiteNavLink[] = overlay
    ? overlay.membershipLinks
    : toWebsiteNavLinks(listMembershipDestinations(brandKit));

  const unionName =
    overlay?.unionName ||
    draft.unionName ||
    websiteDisplayName(brandKit, localNumber);

  const tagline =
    overlay?.tagline ??
    brandKit.local.subText?.trim() ??
    "";

  return {
    localNumber,
    unionName,
    heroText: overlay?.heroText || draft.heroText,
    about1: overlay?.about1 || draft.about1,
    about2: overlay?.about2 || draft.about2,
    contactEmail: overlay?.contactEmail || draft.contactEmail,
    facebookUrl,
    customLinks,
    membershipLinks,
    officeAddress: overlay?.officeAddress || draft.officeAddress,
    contactPhone: overlay?.contactPhone || draft.contactPhone || "",
    officeHours: overlay?.officeHours || draft.officeHours || "",
    ctaLabel: overlay?.ctaLabel || draft.ctaLabel || "",
    tagline,
    websiteUrl: overlay?.websiteUrl || brandKit.websiteUrl?.trim() || "",
    accentColor: overlay?.accentColor || brandKit.accentColor,
    layoutId: coerceWebsiteLayoutId(
      overlay?.layoutId ?? draft.layoutId ?? DEFAULT_WEBSITE_LAYOUT_ID,
    ),
    siteLocale: coerceWebsiteSiteLocale(
      overlay?.siteLocale ?? draft.siteLocale,
    ),
    includePrivacyPage:
      overlay?.includePrivacyPage ?? draft.includePrivacyPage ?? true,
    includeSiteQr: overlay?.includeSiteQr ?? draft.includeSiteQr ?? false,
    events: overlay?.events ?? draft.events ?? [],
    primaryColor: overlay?.primaryColor ?? brandKit.primaryColor,
    secondaryColor: overlay?.secondaryColor ?? brandKit.secondaryColor,
    officers: resolveOfficers(draft, roster, overlay),
    logoFileName: input.logoFileName ?? LOGO_FILE_NAME,
    logoPreviewSrc: input.logoPreviewSrc,
    logoAlt: input.logoAlt || overlay?.logoAlt || unionName,
    includeOpseuResources: overlay
      ? overlay.includeOpseuResources
      : brandKit.unionPresetId === "opseu",
    heroArtId: overlay?.heroArtId ?? input.importedHeroArtId ?? draft.heroArtId,
    heroImageFileName: input.heroImageFileName,
    heroImagePreviewSrc: input.heroImagePreviewSrc,
    heroImageAlt: overlay?.heroImageAlt || draft.heroImageAlt,
    canvas: overlay?.canvas
      ? overlay.canvas
      : brandKit.canvas
        ? {
            surface: canvasTokens.surface,
            typeScale: canvasTokens.typeScale,
            density: canvasTokens.density,
            headlineFontId: canvasTokens.headlineFontId,
            bodyFontId: canvasTokens.bodyFontId,
          }
        : undefined,
  };
}

export { LOGO_FILE_NAME as WEBSITE_COMPOSE_LOGO_FILE_NAME };
