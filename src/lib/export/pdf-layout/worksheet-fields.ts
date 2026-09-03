import {
  WORKSHEET_CHECK_FONT_SIZE,
  WORKSHEET_CHECK_ROW_HEIGHT,
  WORKSHEET_CHECK_ROW_TRAILING,
  WORKSHEET_FIELD_FONT_SIZE,
  WORKSHEET_FIELD_LINE_GAP,
  WORKSHEET_FIELD_RULE_OFFSET,
  WORKSHEET_FIELD_RULE_TRAILING,
  WORKSHEET_PAIR_COL_GAP,
} from "./constants";
import { GUIDE_PDF_PALETTE } from "./constants";
import type { PdfFontContext } from "./types";
import type { JsPdfLike } from "./types";
import { setPdfFont } from "./guide-header";

export {
  WORKSHEET_CHECK_FONT_SIZE,
  WORKSHEET_CHECK_ROW_HEIGHT,
  WORKSHEET_CHECK_ROW_TRAILING,
  WORKSHEET_FIELD_FONT_SIZE,
  WORKSHEET_FIELD_LINE_GAP,
  WORKSHEET_FIELD_RULE_OFFSET,
  WORKSHEET_FIELD_RULE_TRAILING,
};

export type FieldTextMeasurer = {
  wrappedLineCount: (text: string, size: number, maxW: number) => number;
};

function fieldBlockTrailing(): number {
  return WORKSHEET_FIELD_RULE_OFFSET + WORKSHEET_FIELD_RULE_TRAILING;
}

/** Budget height for a wrapped field label + rule — must match drawLabeledFieldBlock. */
export function measureLabeledFieldBlockHeight(
  measurer: FieldTextMeasurer,
  label: string,
  maxWidth: number,
): number {
  const lines = measurer.wrappedLineCount(label, WORKSHEET_FIELD_FONT_SIZE, maxWidth);
  const textHeight = lines * (WORKSHEET_FIELD_FONT_SIZE + WORKSHEET_FIELD_LINE_GAP);
  return textHeight + fieldBlockTrailing();
}

export function measureFieldPairRowHeight(
  measurer: FieldTextMeasurer,
  leftLabel: string,
  rightLabel: string,
  contentWidth: number,
  gap = WORKSHEET_PAIR_COL_GAP,
): number {
  const colW = pairColumnWidth(contentWidth, gap);
  const leftH = measureLabeledFieldBlockHeight(measurer, leftLabel, colW);
  const rightH = measureLabeledFieldBlockHeight(measurer, rightLabel, colW);
  return Math.max(leftH, rightH);
}

export function measureCheckPairRowHeight(
  measurer: FieldTextMeasurer,
  left: string,
  right: string,
  contentWidth: number,
  gap = WORKSHEET_PAIR_COL_GAP,
): number {
  const colW = pairColumnWidth(contentWidth, gap);
  const leftLines = measurer.wrappedLineCount(
    `☐  ${left}`,
    WORKSHEET_CHECK_FONT_SIZE,
    colW,
  );
  const rightLines = measurer.wrappedLineCount(
    `☐  ${right}`,
    WORKSHEET_CHECK_FONT_SIZE,
    colW,
  );
  const rows = Math.max(leftLines, rightLines);
  return rows * WORKSHEET_CHECK_ROW_HEIGHT + WORKSHEET_CHECK_ROW_TRAILING;
}

function drawFieldRule(pdf: JsPdfLike, x1: number, ruleY: number, x2: number): void {
  pdf.setDrawColor(190, 198, 210);
  pdf.setLineWidth(0.55);
  pdf.line(x1, ruleY, x2, ruleY);
}

/** Wrap a field label and draw ruled line(s) beneath — returns Y after the block. */
export function drawLabeledFieldBlock(
  ctx: PdfFontContext,
  label: string,
  x: number,
  maxWidth: number,
  startY: number,
): number {
  const { pdf } = ctx;
  setPdfFont(ctx, WORKSHEET_FIELD_FONT_SIZE, false, GUIDE_PDF_PALETTE.ink);
  const lines = pdf.splitTextToSize(label, maxWidth);
  let y = startY;
  for (const line of lines) {
    pdf.text(line, x, y);
    y += WORKSHEET_FIELD_FONT_SIZE + WORKSHEET_FIELD_LINE_GAP;
  }
  const ruleY = y + WORKSHEET_FIELD_RULE_OFFSET;
  drawFieldRule(pdf, x, ruleY, x + maxWidth);
  return ruleY + WORKSHEET_FIELD_RULE_TRAILING;
}

export function pairColumnWidth(contentWidth: number, gap: number): number {
  return (contentWidth - gap) / 2;
}

/** Draw two labeled fields on one row; row height follows the taller column. */
export function drawFieldPairRow(
  ctx: PdfFontContext,
  leftLabel: string,
  rightLabel: string,
  margin: number,
  contentWidth: number,
  contentRight: number,
  startY: number,
  gap: number,
): number {
  const colW = pairColumnWidth(contentWidth, gap);
  const rightX = margin + colW + gap;
  const leftEnd = drawLabeledFieldBlock(ctx, leftLabel, margin, colW, startY);
  const rightEnd = drawLabeledFieldBlock(ctx, rightLabel, rightX, contentRight - rightX, startY);
  return Math.max(leftEnd, rightEnd);
}

export function drawCheckPairRow(
  ctx: PdfFontContext,
  left: string,
  right: string,
  margin: number,
  contentWidth: number,
  startY: number,
  gap: number,
): number {
  const { pdf } = ctx;
  const colW = pairColumnWidth(contentWidth, gap);
  setPdfFont(ctx, WORKSHEET_CHECK_FONT_SIZE, false, GUIDE_PDF_PALETTE.ink);
  const leftLines = pdf.splitTextToSize(`☐  ${left}`, colW);
  const rightLines = pdf.splitTextToSize(`☐  ${right}`, colW);
  const rows = Math.max(leftLines.length, rightLines.length);
  let y = startY;
  for (let i = 0; i < rows; i++) {
    if (leftLines[i]) pdf.text(leftLines[i]!, margin, y);
    if (rightLines[i]) pdf.text(rightLines[i]!, margin + colW + gap, y);
    y += WORKSHEET_CHECK_ROW_HEIGHT;
  }
  return y + WORKSHEET_CHECK_ROW_TRAILING;
}
