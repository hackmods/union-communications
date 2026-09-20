import type { BrandPalette } from "@/lib/constants/office-templates";

/** Shared semantic foundation for editable Office exports. */
export type OfficeDesignTokens = {
  fonts: { heading: string; body: string };
  colors: { primary: string; secondary: string; accent: string; ink: string; muted: string; surface: string };
  word: { pageWidthTwips: number; pageHeightTwips: number; marginTwips: number; paragraphAfterTwips: number };
  excel: { titleHeight: number; headerHeight: number; bodyHeight: number; defaultWidth: number };
  powerpoint: { width: number; height: number; titleSize: number; bodySize: number };
};

export function createOfficeDesignTokens(opts: {
  palette: BrandPalette;
  headlineFont: string;
  bodyFont: string;
}): OfficeDesignTokens {
  return {
    fonts: { heading: opts.headlineFont, body: opts.bodyFont },
    colors: {
      primary: opts.palette.primary.replace(/^#/, "").toUpperCase(),
      secondary: opts.palette.secondary.replace(/^#/, "").toUpperCase(),
      accent: opts.palette.accent.replace(/^#/, "").toUpperCase(),
      ink: "1A1A1A",
      muted: "4B5563",
      surface: "E8EEF4",
    },
    word: { pageWidthTwips: 12240, pageHeightTwips: 15840, marginTwips: 1008, paragraphAfterTwips: 160 },
    excel: { titleHeight: 26, headerHeight: 22, bodyHeight: 20, defaultWidth: 16 },
    powerpoint: { width: 13.333, height: 7.5, titleSize: 30, bodySize: 16 },
  };
}

export function createWordStyles(tokens: OfficeDesignTokens) {
  return {
    default: { document: { run: { font: tokens.fonts.body, size: 22, color: tokens.colors.ink }, paragraph: { spacing: { after: tokens.word.paragraphAfterTwips, line: 276 } } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: tokens.fonts.heading, size: 40, bold: true, color: tokens.colors.primary } },
      { id: "Subtitle", name: "Subtitle", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: tokens.fonts.body, size: 24, color: tokens.colors.muted } },
      ...[32, 28, 24].map((size, index) => ({ id: `Heading${index + 1}`, name: `Heading ${index + 1}`, basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: tokens.fonts.heading, size, bold: true, color: tokens.colors.secondary } })),
      { id: "Caption", name: "Caption", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: tokens.fonts.body, size: 18, italics: true, color: tokens.colors.muted } },
      { id: "SmallText", name: "Small Text", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: tokens.fonts.body, size: 18, color: tokens.colors.muted } },
    ],
  };
}

export function applyExcelDesignTokens(workbook: import("exceljs").Workbook, tokens: OfficeDesignTokens): void {
  workbook.creator = "UnionOps"; workbook.company = "UnionOps"; workbook.subject = "Editable union document";
  workbook.calcProperties.fullCalcOnLoad = true;
  for (const worksheet of workbook.worksheets) {
    worksheet.properties.defaultRowHeight = tokens.excel.bodyHeight;
    worksheet.pageSetup = { ...worksheet.pageSetup, paperSize: 1 as import("exceljs").PaperSize, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
    worksheet.headerFooter.oddFooter = "&LUnionOps&C&P / &N&R&D";
    for (const column of worksheet.columns) {
      column.font = { ...column.font, name: tokens.fonts.body };
      column.alignment = { ...column.alignment, vertical: "top", wrapText: true };
      if (!column.width) column.width = tokens.excel.defaultWidth;
    }
    worksheet.getRow(1).height = tokens.excel.titleHeight;
    worksheet.getRow(1).font = { ...worksheet.getRow(1).font, name: tokens.fonts.heading };
  }
}

export function createPowerPointTheme(tokens: OfficeDesignTokens) {
  return { headFontFace: tokens.fonts.heading, bodyFontFace: tokens.fonts.body, lang: "en-CA" };
}
