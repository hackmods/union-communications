import type { BrandKit } from "@/types/entities";
import {
  OFFICIAL_LOGOS,
  isOfficialLogoVariant,
  type OfficialLogoVariant,
} from "@/lib/constants/brand";
import {
  coerceOfficialVariantForPack,
  lockupForCanvasBackground,
  resolveIdentityPackForKit,
  resolveOfficialLogos,
} from "@/lib/brand/identity-packs";
import {
  isUnionOpsLogoSrc,
  UNIONOPS_LOGOS,
} from "@/lib/constants/unionPresets";
import {
  coloursClash,
  INK_WHITE,
  isLightInk,
  logoRasterFilter,
  pickContrastingInk,
  type InkTone,
} from "@/lib/utils/ink";
import { contrastRatio } from "@/lib/utils/contrast";

/** Paper plate behind full-colour logos on brand fills (upload-safe). */
export type LogoSafePlate = {
  backgroundColor: string;
  paddingPx: number;
  radiusPx: number;
};

export type BrandLogoPresentation = {
  src: string;
  /** CSS filter for preview or canvas rasterize (Office / export embeds). */
  cssFilter?: string;
  /**
   * Contrasting back plate so full-colour uploads (and pack lockups without a
   * reverse asset) stay readable on brand fills without destroying colours.
   */
  plate?: LogoSafePlate;
};

/** Shared chrome — same idea as QR white-card plates; export-safe solid fill. */
export const LOGO_SAFE_PLATE: LogoSafePlate = {
  backgroundColor: INK_WHITE,
  paddingPx: 6,
  radiusPx: 4,
};

function resolveInk(backgroundColor?: string): InkTone | null {
  return backgroundColor?.trim()
    ? pickContrastingInk(backgroundColor.trim())
    : null;
}

/** True when the canvas is already paper-like — a white plate would be noise. */
export function canvasIsNearPaper(backgroundColor: string): boolean {
  const ratio = contrastRatio(backgroundColor.trim(), INK_WHITE);
  return ratio !== null && ratio < 1.2;
}

/** True when any kit brand colour would disappear into the canvas fill. */
function brandColoursClashWithBackground(
  kit: Pick<BrandKit, "primaryColor" | "secondaryColor" | "accentColor">,
  backgroundColor: string,
): boolean {
  const bg = backgroundColor.trim();
  const colours = [kit.primaryColor, kit.secondaryColor, kit.accentColor];
  return colours.some((c) => Boolean(c?.trim()) && coloursClash(c.trim(), bg));
}

function safePlateForCanvas(backgroundColor: string): LogoSafePlate | undefined {
  if (canvasIsNearPaper(backgroundColor)) return undefined;
  return LOGO_SAFE_PLATE;
}

function resolveOfficialPresentation(
  kit: BrandKit,
  variant: OfficialLogoVariant,
  ink: InkTone | null,
  backgroundColor?: string,
): BrandLogoPresentation {
  const logos = resolveOfficialLogos(kit);
  const effective = coerceOfficialVariantForPack(logos, variant);
  const filter = ink ? logoRasterFilter(ink) : undefined;
  const bg = backgroundColor?.trim();

  if (effective === "lockup") {
    const lockup = logos?.lockup ?? {
      src: OFFICIAL_LOGOS.lockup.src,
      srcOnDark: undefined as string | undefined,
    };

    // Prefer the plate asset whose primary matches this canvas fill (coral
    // knockout on coral, on-gold on gold) — even when that plate is not the
    // active Brand Kit campaign. Avoids half-invisible multi-colour lockups.
    const pack = resolveIdentityPackForKit(kit);
    const plateLockup = lockupForCanvasBackground(pack, bg);
    if (plateLockup) {
      return { src: plateLockup };
    }

    if (lockup.srcOnDark && bg) {
      const primary = kit.primaryColor.trim().toUpperCase();
      // Knockout on dark plates, and on the kit primary plate even when ink is
      // dark (CAAT-S coral uses white/gold lockup on coral fills).
      const useReverse =
        (ink !== null && isLightInk(ink)) || bg.toUpperCase() === primary;
      if (useReverse) return { src: lockup.srcOnDark };
    }
    if (ink && isLightInk(ink)) {
      return { src: lockup.src, cssFilter: filter };
    }
    // No reverse asset + brand colours clash with the fill → paper plate so
    // multi-colour lockups stay intact (same path uploads use).
    if (ink && bg && brandColoursClashWithBackground(kit, bg)) {
      const plate = safePlateForCanvas(bg);
      if (plate) return { src: lockup.src, plate };
      return { src: lockup.src, cssFilter: filter };
    }
    return { src: lockup.src };
  }

  if (effective === "slitBlue") {
    return {
      src: logos?.slitBlue?.src ?? OFFICIAL_LOGOS.slitBlue.src,
      cssFilter: ink !== null ? filter : undefined,
    };
  }
  if (effective === "slitWhite") {
    return {
      src: logos?.slitWhite?.src ?? OFFICIAL_LOGOS.slitWhite.src,
      cssFilter: ink !== null && !isLightInk(ink) ? filter : undefined,
    };
  }

  const mark = logos?.mark ?? {
    src: OFFICIAL_LOGOS.mark.src,
    srcOnDark: OFFICIAL_LOGOS.mark.srcOnDark,
  };
  if (ink && isLightInk(ink)) {
    return { src: mark.srcOnDark ?? mark.src };
  }
  return {
    src: mark.src,
    cssFilter: ink !== null ? filter : undefined,
  };
}

/**
 * Pick logo asset + optional CSS filter / safe plate for a background fill.
 * Mirrors canvas `BrandLogo` — use for Office headers on brand primary fields.
 *
 * Durable policy for unknown uploads: paper plate + full colour (not outline,
 * not forced monochrome). Identity packs still prefer designed reverse assets.
 */
export function resolveBrandLogoPresentation(
  brandKit: BrandKit,
  backgroundColor?: string,
  variantOverride?: "lockup" | "mark",
): BrandLogoPresentation {
  const ink = resolveInk(backgroundColor);

  if (brandKit.useOfficialLogo) {
    const logos = resolveOfficialLogos(brandKit);
    const kitVariant = isOfficialLogoVariant(brandKit.officialLogoVariant)
      ? brandKit.officialLogoVariant
      : "lockup";
    const requested: OfficialLogoVariant =
      variantOverride === "lockup" || variantOverride === "mark"
        ? variantOverride
        : kitVariant;
    const variant = coerceOfficialVariantForPack(logos, requested);
    return resolveOfficialPresentation(brandKit, variant, ink, backgroundColor);
  }

  const customSrc = brandKit.customLogoDataUrl?.trim();
  if (customSrc && !isUnionOpsLogoSrc(customSrc)) {
    const bg = backgroundColor?.trim();
    const looksLikeWhiteMark =
      customSrc.includes("logo-mark-white") ||
      customSrc.includes("mark-on-dark") ||
      customSrc.includes("on-dark") ||
      customSrc.includes("lockup-reverse");

    // White / reverse assets: keep tint path (plate would hide light ink).
    if (looksLikeWhiteMark) {
      const filter =
        ink !== null && !(ink && isLightInk(ink) && looksLikeWhiteMark)
          ? logoRasterFilter(ink)
          : undefined;
      return { src: customSrc, cssFilter: filter };
    }

    // Any other upload on a brand fill: paper plate, preserve full colour.
    if (bg && ink) {
      const plate = safePlateForCanvas(bg);
      if (plate) return { src: customSrc, plate };
    }
    return { src: customSrc };
  }

  return { src: UNIONOPS_LOGOS.markInterlock };
}
