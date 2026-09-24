import type { BrandPalette } from "@/lib/constants/office-templates";
import { pickContrastingInk } from "@/lib/utils/ink";

/** Shared semantic foundation for editable Office exports. */
export type OfficeDesignTokens = {
  fonts: { heading: string; body: string };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    ink: string;
    /** Contrasting ink for text sitting on `primary` (same rule as Word). */
    inkOnPrimary: string;
    muted: string;
    surface: string;
  };
  word: {
    pageWidthTwips: number;
    pageHeightTwips: number;
    marginTwips: number;
    paragraphAfterTwips: number;
  };
  excel: {
    titleHeight: number;
    headerHeight: number;
    bodyHeight: number;
    defaultWidth: number;
  };
  powerpoint: {
    width: number;
    height: number;
    titleSize: number;
    bodySize: number;
  };
};

function stripHash(hex: string): string {
  return hex.replace(/^#/, "").toUpperCase();
}

export function createOfficeDesignTokens(opts: {
  palette: BrandPalette;
  headlineFont: string;
  bodyFont: string;
}): OfficeDesignTokens {
  const primary = stripHash(opts.palette.primary);
  return {
    fonts: { heading: opts.headlineFont, body: opts.bodyFont },
    colors: {
      primary,
      secondary: stripHash(opts.palette.secondary),
      accent: stripHash(opts.palette.accent),
      ink: "1A1A1A",
      inkOnPrimary: stripHash(pickContrastingInk(opts.palette.primary)),
      muted: "4B5563",
      surface: "E8EEF4",
    },
    word: {
      pageWidthTwips: 12240,
      pageHeightTwips: 15840,
      marginTwips: 1008,
      paragraphAfterTwips: 160,
    },
    // Taller bands so brand chrome breathes like Word letterhead padding
    excel: {
      titleHeight: 32,
      headerHeight: 26,
      bodyHeight: 22,
      defaultWidth: 16,
    },
    powerpoint: { width: 13.333, height: 7.5, titleSize: 30, bodySize: 16 },
  };
}

export function createWordStyles(tokens: OfficeDesignTokens) {
  return {
    default: {
      document: {
        run: {
          font: tokens.fonts.body,
          size: 22,
          color: tokens.colors.ink,
        },
        paragraph: {
          spacing: { after: tokens.word.paragraphAfterTwips, line: 276 },
        },
      },
    },
    paragraphStyles: [
      {
        id: "Title",
        name: "Title",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          font: tokens.fonts.heading,
          size: 40,
          bold: true,
          color: tokens.colors.primary,
        },
      },
      {
        id: "Subtitle",
        name: "Subtitle",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          font: tokens.fonts.body,
          size: 24,
          color: tokens.colors.muted,
        },
      },
      ...[32, 28, 24].map((size, index) => ({
        id: `Heading${index + 1}`,
        name: `Heading ${index + 1}`,
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          font: tokens.fonts.heading,
          size,
          bold: true,
          color: tokens.colors.secondary,
        },
      })),
      {
        id: "Caption",
        name: "Caption",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          font: tokens.fonts.body,
          size: 18,
          italics: true,
          color: tokens.colors.muted,
        },
      },
      {
        id: "SmallText",
        name: "Small Text",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          font: tokens.fonts.body,
          size: 18,
          color: tokens.colors.muted,
        },
      },
    ],
  };
}

/**
 * Workbook chrome only. Never set column/row `.font` after cells are styled —
 * ExcelJS column fonts clobber per-cell ink and turn branded orange bands black.
 */
export function applyExcelDesignTokens(
  workbook: import("exceljs").Workbook,
  tokens: OfficeDesignTokens,
): void {
  workbook.creator = "UnionOps";
  workbook.company = "UnionOps";
  workbook.subject = "Editable union document";
  workbook.calcProperties.fullCalcOnLoad = true;
  for (const worksheet of workbook.worksheets) {
    worksheet.properties.defaultRowHeight = tokens.excel.bodyHeight;
    worksheet.pageSetup = {
      ...worksheet.pageSetup,
      paperSize: 1 as import("exceljs").PaperSize,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    };
    worksheet.headerFooter.oddFooter = "&LUnionOps&C&P / &N&R&D";
    for (const column of worksheet.columns) {
      const prior = column.alignment ?? {};
      column.alignment = {
        ...prior,
        vertical: prior.vertical ?? "top",
        wrapText: prior.wrapText ?? true,
      };
      if (!column.width) column.width = tokens.excel.defaultWidth;
    }
    const titleRow = worksheet.getRow(1);
    if (
      titleRow.height == null ||
      titleRow.height < tokens.excel.titleHeight
    ) {
      titleRow.height = tokens.excel.titleHeight;
    }
  }
}

export function createPowerPointTheme(tokens: OfficeDesignTokens) {
  return {
    headFontFace: tokens.fonts.heading,
    bodyFontFace: tokens.fonts.body,
    lang: "en-CA",
  };
}
