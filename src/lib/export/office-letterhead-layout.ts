/**
 * Shared letterhead geometry for Document Generator preview, Word, and PowerPoint.
 * CSS mock stays illustrative; this contract keeps the brand band full-width.
 */

import {
  logoDisplaySizePx,
  type BrandLogoBytes,
} from "@/lib/export/brand-logo-bytes";

/** Print-visible logo slot (px at 96 dpi). Larger than the old 140×56 stamp. */
export const LETTERHEAD_LOGO_MAX_W_PX = 220;
export const LETTERHEAD_LOGO_MAX_H_PX = 88;

/** US Letter — matches `createOfficeDesignTokens().word`. */
export const LETTERHEAD_PAGE_WIDTH_TWIPS = 12240;
export const LETTERHEAD_MARGIN_TWIPS = 1008;

/** 16px / 12px (Tailwind `px-4` / `py-3`) → twips at 96 dpi. */
export const LETTERHEAD_CELL_PAD_X_TWIPS = 240;
export const LETTERHEAD_CELL_PAD_Y_TWIPS = 180;

const TWIPS_PER_PX = 15; // 1440 twips/in ÷ 96 px/in

export type LetterheadBandWidths = {
  contentTwips: number;
  logoColTwips: number;
  textColTwips: number;
  cellPadXTwips: number;
  cellPadYTwips: number;
};

export function letterheadContentWidthTwips(
  pageWidthTwips = LETTERHEAD_PAGE_WIDTH_TWIPS,
  marginTwips = LETTERHEAD_MARGIN_TWIPS,
): number {
  return Math.max(1, pageWidthTwips - marginTwips * 2);
}

export function letterheadBandWidths(
  pageWidthTwips = LETTERHEAD_PAGE_WIDTH_TWIPS,
  marginTwips = LETTERHEAD_MARGIN_TWIPS,
): LetterheadBandWidths {
  const contentTwips = letterheadContentWidthTwips(pageWidthTwips, marginTwips);
  const logoColTwips = Math.min(
    contentTwips,
    LETTERHEAD_LOGO_MAX_W_PX * TWIPS_PER_PX +
      LETTERHEAD_CELL_PAD_X_TWIPS +
      120,
  );
  const textColTwips = Math.max(1, contentTwips - logoColTwips);
  return {
    contentTwips,
    logoColTwips,
    textColTwips,
    cellPadXTwips: LETTERHEAD_CELL_PAD_X_TWIPS,
    cellPadYTwips: LETTERHEAD_CELL_PAD_Y_TWIPS,
  };
}

/** Contact line used by Word, PowerPoint, and the CSS mock. */
export function composeLetterheadContact(
  fields: Record<string, string | undefined>,
): string {
  const name = fields.contactName?.trim();
  if (name) return name;
  return [
    fields.officeEmail?.trim(),
    fields.officePhone?.trim(),
    fields.officeAddress?.trim(),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function letterheadLogoSlotPx(
  logo: Pick<BrandLogoBytes, "widthPx" | "heightPx">,
): [number, number] {
  return logoDisplaySizePx(
    logo as BrandLogoBytes,
    LETTERHEAD_LOGO_MAX_W_PX,
    LETTERHEAD_LOGO_MAX_H_PX,
  );
}

/** pptxgenjs uses inches. */
export function letterheadLogoInches(
  logo: Pick<BrandLogoBytes, "widthPx" | "heightPx">,
): { w: number; h: number } {
  const [w, h] = letterheadLogoSlotPx(logo);
  return { w: w / 96, h: h / 96 };
}

export function letterheadPptxBandHeightInches(
  logo?: Pick<BrandLogoBytes, "widthPx" | "heightPx"> | null,
): number {
  const pad = LETTERHEAD_CELL_PAD_Y_TWIPS / 1440;
  if (!logo) return Math.max(1.1, pad * 2 + 0.7);
  const { h } = letterheadLogoInches(logo);
  return Math.max(1.15, h + pad * 2);
}

/** Word half-points → CSS px at 96 dpi (hp / 2 × 96/72). */
export function headerHalfPointsToMockPx(halfPoints: number): number {
  return Math.max(10, Math.round((halfPoints * 2) / 3));
}
