import { BRAND_COLORS } from "@/lib/constants/brand";
import {
  INK_BLACK,
  INK_WHITE,
  isLightInk,
  pickContrastingInk,
  type InkTone,
} from "@/lib/utils/ink";

export interface UnionOpsMarkSvgColors {
  /** Rounded plate fill (Brand Kit / host primary). */
  primary: string;
}

/**
 * Resolve plate + glyph the same way as `UnionOpsMark` ink modes:
 * - light ink → white plate, primary glyph
 * - dark ink → black plate, white glyph
 * - no ink → primary plate, contrasting black/white glyph
 */
export function resolveUnionOpsMarkPaint(
  primary: string,
  ink?: InkTone | null,
): { plate: string; glyph: string } {
  const platePrimary = primary || BRAND_COLORS.primary;

  if (ink) {
    if (isLightInk(ink)) {
      return { plate: INK_WHITE, glyph: platePrimary };
    }
    return { plate: INK_BLACK, glyph: INK_WHITE };
  }

  return {
    plate: platePrimary,
    glyph: pickContrastingInk(platePrimary),
  };
}

/**
 * Static UnionOps mark SVG — brand primary plate + auto black/white glyph.
 */
export function buildUnionOpsMarkSvg(colors: UnionOpsMarkSvgColors): string {
  const { plate, glyph } = resolveUnionOpsMarkPaint(colors.primary);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="UnionOps">
  <title>UnionOps</title>
  <desc>Interlocking u and o mark for UnionOps (brand plate, contrast-safe glyphs).</desc>
  <rect width="64" height="64" rx="14" fill="${plate}"/>
  <!-- O (behind) -->
  <circle
    cx="44"
    cy="34"
    r="14"
    fill="none"
    stroke="${glyph}"
    stroke-width="10"
  />
  <!-- U (overlap) -->
  <path
    d="M12 14v20a14 14 0 0 0 28 0V14"
    fill="none"
    stroke="${glyph}"
    stroke-width="10"
    stroke-linecap="butt"
    stroke-linejoin="round"
    opacity="0.88"
  />
</svg>
`;
}

/**
 * Favicon / PWA icon SVG — tighter glyph fill for small OS chrome (16–512).
 * Same paint rules as `resolveUnionOpsMarkPaint` (primary plate + contrast glyph).
 */
export function buildPwaIconSvg(colors: UnionOpsMarkSvgColors): string {
  const { plate, glyph } = resolveUnionOpsMarkPaint(colors.primary);
  // stroke ~8.75 + slight scale matches scripts/generate-favicons.mjs favicon glyph
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="UnionOps">
  <title>UnionOps</title>
  <desc>Interlocking u and o mark for UnionOps PWA / home-screen icons.</desc>
  <rect width="64" height="64" rx="14" fill="${plate}"/>
  <g transform="translate(32 32) scale(1.06 1.32) translate(-34.5 -32)" fill="none" stroke="${glyph}" stroke-linecap="butt" stroke-linejoin="round">
    <circle cx="44" cy="34" r="14" stroke-width="8.75"/>
    <path d="M12 12v22a14 14 0 0 0 28 0V12" stroke-width="8.75"/>
  </g>
</svg>
`;
}

/**
 * Favicon SVG with host brand plate and automatic black/white contrast.
 *
 * Light scheme: primary plate + black or white glyph (`pickContrastingInk`).
 * Dark scheme: mirrors `UnionOpsMark` ink modes for readable tab chrome.
 */
export function buildAdaptiveFaviconSvg(colors: UnionOpsMarkSvgColors): string {
  const primary = colors.primary || BRAND_COLORS.primary;
  const ink = pickContrastingInk(primary);
  const light = resolveUnionOpsMarkPaint(primary);
  const dark = resolveUnionOpsMarkPaint(primary, ink);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="UnionOps">
  <title>UnionOps</title>
  <desc>Interlocking u and o mark — brand layout colours with automatic black/white contrast.</desc>
  <style>
    .plate { fill: ${light.plate}; }
    .glyph { stroke: ${light.glyph}; }
    @media (prefers-color-scheme: dark) {
      .plate { fill: ${dark.plate}; }
      .glyph { stroke: ${dark.glyph}; }
    }
  </style>
  <rect class="plate" width="64" height="64" rx="14"/>
  <!-- O (behind) -->
  <circle
    class="glyph"
    cx="44"
    cy="34"
    r="14"
    fill="none"
    stroke-width="10"
  />
  <!-- U (overlap) -->
  <path
    class="glyph"
    d="M12 14v20a14 14 0 0 0 28 0V14"
    fill="none"
    stroke-width="10"
    stroke-linecap="butt"
    stroke-linejoin="round"
    opacity="0.88"
  />
</svg>
`;
}
