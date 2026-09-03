import {
  GUIDE_PDF_PALETTE,
  LETTER_PAGE_HEIGHT_PT,
  LETTER_PAGE_WIDTH_PT,
  WORKSHEET_CLOSING_GAP,
  WORKSHEET_HEADER_BODY_GAP,
  WORKSHEET_HEADER_RULE_GAP_AFTER_RULE,
  WORKSHEET_HEADER_RULE_GAP_AFTER_TITLE,
  WORKSHEET_MARGIN_DEFAULT,
  WORKSHEET_MARK_TITLE_GAP,
  WORKSHEET_PAIR_COL_GAP,
  WORKSHEET_LINE_AFTER_TEXT_GAP,
  WORKSHEET_RULED_BLOCK_LEADING,
  WORKSHEET_RULED_BLOCK_TRAILING,
  WORKSHEET_RULE_ROW_DEFAULT,
  WORKSHEET_SECTION_GAP,
} from "./constants";
import type { GuideFooterBandContent } from "./types";
import type { WorksheetLayoutMode } from "./types";
import type { WorksheetLine, WorksheetSection } from "./worksheet-types";
import {
  measureCheckPairRowHeight,
  measureFieldPairRowHeight,
  measureLabeledFieldBlockHeight,
} from "./worksheet-fields";

export type TextMeasurer = {
  wrappedLineCount: (text: string, size: number, maxW: number) => number;
};

/** Static text measurer for budget API (approximates jsPDF splitTextToSize at ~10 chars/pt). */
export function createStaticTextMeasurer(contentWidth: number): TextMeasurer {
  const avgCharsPerLine = Math.max(24, Math.floor(contentWidth / 6));
  return {
    wrappedLineCount(text: string, size: number, maxW: number) {
      void size;
      void maxW;
      const len = text.length;
      return Math.max(1, Math.ceil(len / avgCharsPerLine));
    },
  };
}

export function measureWrappedHeight(
  measurer: TextMeasurer,
  text: string,
  size: number,
  lineGap: number,
  maxW: number,
): number {
  return measurer.wrappedLineCount(text, size, maxW) * (size + lineGap);
}

export function measureWorksheetLine(
  measurer: TextMeasurer,
  line: WorksheetLine,
  contentWidth: number,
): number {
  switch (line.kind) {
    case "text":
      return (
        measureWrappedHeight(measurer, line.text, 8.5, 1, contentWidth) +
        WORKSHEET_LINE_AFTER_TEXT_GAP
      );
    case "field":
    case "fieldInline":
      return measureLabeledFieldBlockHeight(measurer, line.label, contentWidth);
    case "fieldPair":
      return measureFieldPairRowHeight(
        measurer,
        line.left.label,
        line.right.label,
        contentWidth,
        WORKSHEET_PAIR_COL_GAP,
        line.layout,
      );
    case "ruled": {
      const rowHeight = line.rowHeight ?? WORKSHEET_RULE_ROW_DEFAULT;
      const count = line.fill ? line.minRows ?? 6 : line.count ?? 0;
      return (
        WORKSHEET_RULED_BLOCK_LEADING +
        count * rowHeight +
        WORKSHEET_RULED_BLOCK_TRAILING
      );
    }
    case "check":
      return measureWrappedHeight(measurer, `☐  ${line.text}`, 8, 1, contentWidth);
    case "checkPair":
      return measureCheckPairRowHeight(
        measurer,
        line.left,
        line.right,
        contentWidth,
        WORKSHEET_PAIR_COL_GAP,
        line.layout,
      );
    case "table": {
      const rowHeight = line.rowHeight ?? 14;
      return rowHeight * (1 + line.rows);
    }
    case "columnLayout": {
      const gap = line.gap ?? 12;
      const colW = (contentWidth - gap * (line.columns.length - 1)) / line.columns.length;
      let maxCol = 0;
      for (const col of line.columns) {
        let h = 0;
        for (const inner of col.lines) {
          h += measureWorksheetLine(measurer, inner, colW);
        }
        maxCol = Math.max(maxCol, h);
      }
      return maxCol;
    }
    case "pageBreak":
      return 0;
  }
}

export function measureWorksheetSectionBlock(
  measurer: TextMeasurer,
  sections: WorksheetSection[],
  contentWidth: number,
): number {
  let h = 0;
  for (const section of sections) {
    h += WORKSHEET_SECTION_GAP;
    h += 9.5 + 1;
    if (section.intro) {
      h += measureWrappedHeight(measurer, section.intro, 7.5, 0, contentWidth);
    }
    for (const line of section.lines) {
      h += measureWorksheetLine(measurer, line, contentWidth);
    }
  }
  return h;
}

export function measureFooterBandHeight(
  measurer: TextMeasurer,
  band: GuideFooterBandContent,
  contentWidth: number,
): number {
  let h = 0;
  h += measurer.wrappedLineCount(band.footer, 7, contentWidth) * 8;
  if (band.reminder) {
    h += 2;
    h += measurer.wrappedLineCount(band.reminder, 7, contentWidth) * 8;
  }
  if (band.tips?.lines.length) {
    h += 2 + 9;
    for (const tip of band.tips.lines) {
      h += measurer.wrappedLineCount(`• ${tip}`, 7.5, contentWidth) * 8;
    }
  }
  return h;
}

/** Approximate compact worksheet header height below the mark (pt). */
export function measureWorksheetHeaderHeight(
  measurer: TextMeasurer,
  input: { title: string; subtitle?: string; instructions?: string },
  contentWidth: number,
): number {
  let h = 0;
  h += measureWrappedHeight(measurer, input.title, 12, 1, contentWidth);
  h += WORKSHEET_HEADER_RULE_GAP_AFTER_TITLE + WORKSHEET_HEADER_RULE_GAP_AFTER_RULE;
  if (input.subtitle) h += measureWrappedHeight(measurer, input.subtitle, 8, 1, contentWidth);
  if (input.instructions) {
    h += measureWrappedHeight(measurer, input.instructions, 7.5, 1, contentWidth);
  }
  h += WORKSHEET_HEADER_BODY_GAP;
  return h;
}

export type WorksheetZoneHeights = {
  header: number;
  body: number;
  closing: number;
  footer: number;
  total: number;
  contentBottom: number;
};

export function computeWorksheetZones(opts: {
  measurer: TextMeasurer;
  margin?: number;
  pageHeight?: number;
  layoutMode: WorksheetLayoutMode;
  header: { title: string; subtitle?: string; instructions?: string };
  sections: WorksheetSection[];
  closingSections?: WorksheetSection[];
  footer: GuideFooterBandContent;
}): WorksheetZoneHeights {
  const margin = opts.margin ?? WORKSHEET_MARGIN_DEFAULT;
  const pageHeight = opts.pageHeight ?? LETTER_PAGE_HEIGHT_PT;
  const pageWidth = LETTER_PAGE_WIDTH_PT;
  const contentWidth = pageWidth - margin * 2;

  const header =
    measureWorksheetHeaderHeight(opts.measurer, opts.header, contentWidth) +
    24 +
    WORKSHEET_MARK_TITLE_GAP;
  const body = measureWorksheetSectionBlock(opts.measurer, opts.sections, contentWidth);
  const closing = opts.closingSections?.length
    ? measureWorksheetSectionBlock(opts.measurer, opts.closingSections, contentWidth) +
      WORKSHEET_CLOSING_GAP
    : 0;
  const footer = measureFooterBandHeight(opts.measurer, opts.footer, contentWidth);

  const contentBottom =
    pageHeight - margin - footer - closing - WORKSHEET_CLOSING_GAP;

  return {
    header,
    body,
    closing,
    footer,
    total: header + body + closing + footer,
    contentBottom,
  };
}

export { GUIDE_PDF_PALETTE };
