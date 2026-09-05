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
