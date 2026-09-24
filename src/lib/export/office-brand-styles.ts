/**
 * Shared Brand Kit → Office (DOCX / XLSX / PPTX) face resolution.
 * Keeps Hub minutes/ballots and Document Generator worksheets on one path.
 */

import {
  canvasFontOfficeName,
  DEFAULT_BODY_FONT,
  DEFAULT_HEADLINE_FONT,
  type CanvasFontId,
} from "@/lib/comms/canvas-fonts";
import { pickContrastingInk } from "@/lib/utils/ink";

export type OfficeBrandFontOpts = {
  headlineFont?: string;
  bodyFont?: string;
  headlineFontId?: CanvasFontId;
  bodyFontId?: CanvasFontId;
};

export type ResolvedOfficeBrandFonts = {
  headlineFont: string;
  bodyFont: string;
  headlineFontId: CanvasFontId;
  bodyFontId: CanvasFontId;
};

export function resolveOfficeBrandFonts(
  opts?: OfficeBrandFontOpts | null,
): ResolvedOfficeBrandFonts {
  const headlineFontId = opts?.headlineFontId ?? DEFAULT_HEADLINE_FONT;
  const bodyFontId = opts?.bodyFontId ?? DEFAULT_BODY_FONT;
  return {
    headlineFontId,
    bodyFontId,
    headlineFont: opts?.headlineFont ?? canvasFontOfficeName(headlineFontId),
    bodyFont: opts?.bodyFont ?? canvasFontOfficeName(bodyFontId),
  };
}

/** Merge a Brand Kit face into an ExcelJS font object (name only when provided). */
export function withOfficeXlsxFont<T extends Record<string, unknown>>(
  font: T,
  faceName?: string | null,
): T & { name?: string } {
  if (!faceName) return { ...font };
  return { ...font, name: faceName };
}

/** ExcelJS ARGB from `#RGB` / `#RRGGBB` / bare hex (matches Word `hexNoHash` fills). */
export function officeXlsxHexArgb(hex: string): string {
  const h = hex.replace(/^#/, "").toUpperCase();
  if (h.length === 8) return h;
  return `FF${h}`;
}

/**
 * Contrasting ink ARGB for text on a brand fill — same rule as Word DOCX
 * (`pickContrastingInk`). Prefer this over hard-coded white.
 */
export function officeXlsxInkArgbOn(background: string): string {
  return officeXlsxHexArgb(pickContrastingInk(background));
}

export type OfficeXlsxBrandBandOpts = {
  background: string;
  faceName?: string | null;
  bold?: boolean;
  size?: number;
  italic?: boolean;
};

/**
 * Font + solid fill + middle vertical alignment for branded Excel bands.
 * Keeps Excel parity with Word letterhead chrome on orange / navy / coral.
 */
export function officeXlsxBrandBandStyle(opts: OfficeXlsxBrandBandOpts) {
  return {
    font: withOfficeXlsxFont(
      {
        bold: opts.bold ?? true,
        ...(opts.size != null ? { size: opts.size } : {}),
        ...(opts.italic ? { italic: true } : {}),
        color: { argb: officeXlsxInkArgbOn(opts.background) },
      },
      opts.faceName,
    ),
    fill: {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: officeXlsxHexArgb(opts.background) },
    },
    alignment: {
      vertical: "middle" as const,
      wrapText: true,
    },
  };
}
