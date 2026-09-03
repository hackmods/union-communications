import {
  WORKSHEET_CHECK_FONT_SIZE,
  WORKSHEET_CHECK_ROW_HEIGHT,
  WORKSHEET_CHECK_ROW_TRAILING,
  WORKSHEET_CHECK_PAIR_LEADING,
  WORKSHEET_CHECK_PAIR_ROW_GAP,
  WORKSHEET_FIELD_BLOCK_LEADING,
  WORKSHEET_FIELD_FONT_SIZE,
  WORKSHEET_FIELD_LINE_GAP,
  WORKSHEET_FIELD_RULE_OFFSET,
  WORKSHEET_FIELD_RULE_TRAILING,
  WORKSHEET_FIELD_TEXT_INSET,
  WORKSHEET_PAIR_COL_GAP,
  WORKSHEET_PAIR_ROW_GAP,
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

export type PairLayoutMode = "row" | "stack";

function fieldBlockTrailing(): number {
  return WORKSHEET_FIELD_RULE_OFFSET + WORKSHEET_FIELD_RULE_TRAILING;
}

function fieldTextHeight(lineCount: number): number {
  return lineCount * (WORKSHEET_FIELD_FONT_SIZE + WORKSHEET_FIELD_LINE_GAP);
}

function measureWrappedFieldLines(
  measurer: FieldTextMeasurer,
  label: string,
  maxWidth: number,
): number {
  return measurer.wrappedLineCount(
    label,
    WORKSHEET_FIELD_FONT_SIZE,
    usableTextWidth(maxWidth),
  );
}

/** Draw wrapped label lines only — returns Y after the last text baseline. */
function drawFieldLabelLines(
  ctx: PdfFontContext,
  label: string,
  x: number,
  maxWidth: number,
  startY: number,
  leading = WORKSHEET_FIELD_BLOCK_LEADING,
): number {
  const { pdf } = ctx;
  setPdfFont(ctx, WORKSHEET_FIELD_FONT_SIZE, false, GUIDE_PDF_PALETTE.ink);
  const lines = wrapPdfTextLines(ctx, label, maxWidth);
  let y = startY + leading;
  for (const line of lines) {
    pdf.text(line, x + WORKSHEET_FIELD_TEXT_INSET, y);
    y += WORKSHEET_FIELD_FONT_SIZE + WORKSHEET_FIELD_LINE_GAP;
  }
  return y;
}

function usableTextWidth(maxWidth: number): number {
  return Math.max(32, maxWidth - WORKSHEET_FIELD_TEXT_INSET * 2);
}

function lineFitsWidth(pdf: JsPdfLike, line: string, maxWidth: number): boolean {
  return pdf.getTextWidth(line) <= maxWidth - WORKSHEET_FIELD_TEXT_INSET;
}

/** Wrap text with custom-font-safe width checks — avoids column bleed. */
export function wrapPdfTextLines(
  ctx: PdfFontContext,
  text: string,
  maxWidth: number,
): string[] {
  const { pdf } = ctx;
  const budget = usableTextWidth(maxWidth);
  const raw = pdf.splitTextToSize(text, budget);
  const lines: string[] = [];

  for (const line of raw) {
    if (lineFitsWidth(pdf, line, maxWidth)) {
      lines.push(line);
      continue;
    }
    let chunk = "";
    for (const word of line.split(/\s+/)) {
      const candidate = chunk ? `${chunk} ${word}` : word;
      if (lineFitsWidth(pdf, candidate, maxWidth)) {
        chunk = candidate;
      } else {
        if (chunk) lines.push(chunk);
        chunk = word;
      }
    }
    if (chunk) lines.push(chunk);
  }

  return lines.length ? lines : raw;
}

function wrappedLineCountForMeasurer(
  measurer: FieldTextMeasurer,
  text: string,
  size: number,
  maxWidth: number,
): number {
  return measurer.wrappedLineCount(text, size, usableTextWidth(maxWidth));
}

export function resolvePairLayoutFromRender(
  ctx: PdfFontContext,
  leftText: string,
  rightText: string,
  colWidth: number,
  fontSize: number,
  layout?: PairLayoutMode,
): PairLayoutMode {
  void ctx;
  void leftText;
  void rightText;
  void colWidth;
  void fontSize;
  return layout === "stack" ? "stack" : "row";
}

export function resolvePairLayout(
  layout: PairLayoutMode | undefined,
  measurer: FieldTextMeasurer,
  leftText: string,
  rightText: string,
  colWidth: number,
  fontSize: number,
): PairLayoutMode {
  void measurer;
  void leftText;
  void rightText;
  void colWidth;
  void fontSize;
  return layout === "stack" ? "stack" : "row";
}

/** Budget height for a wrapped field label + rule — must match drawLabeledFieldBlock. */
export function measureLabeledFieldBlockHeight(
  measurer: FieldTextMeasurer,
  label: string,
  maxWidth: number,
): number {
  const lines = measureWrappedFieldLines(measurer, label, maxWidth);
  return WORKSHEET_FIELD_BLOCK_LEADING + fieldTextHeight(lines) + fieldBlockTrailing();
}

export function measureFieldPairRowHeight(
  measurer: FieldTextMeasurer,
  leftLabel: string,
  rightLabel: string,
  contentWidth: number,
  gap = WORKSHEET_PAIR_COL_GAP,
  layout?: PairLayoutMode,
): number {
  const colW = pairColumnWidth(contentWidth, gap);
  const mode = resolvePairLayout(
    layout,
    measurer,
    leftLabel,
    rightLabel,
    colW,
    WORKSHEET_FIELD_FONT_SIZE,
  );
  if (mode === "stack") {
    return (
      measureLabeledFieldBlockHeight(measurer, leftLabel, contentWidth) +
      measureLabeledFieldBlockHeight(measurer, rightLabel, contentWidth) +
      WORKSHEET_PAIR_ROW_GAP
    );
  }
  const leftLines = measureWrappedFieldLines(measurer, leftLabel, colW);
  const rightLines = measureWrappedFieldLines(measurer, rightLabel, colW);
  return (
    WORKSHEET_FIELD_BLOCK_LEADING +
    Math.max(fieldTextHeight(leftLines), fieldTextHeight(rightLines)) +
    fieldBlockTrailing() +
    WORKSHEET_PAIR_ROW_GAP
  );
}

export function measureCheckPairRowHeight(
  measurer: FieldTextMeasurer,
  left: string,
  right: string,
  contentWidth: number,
  gap = WORKSHEET_PAIR_COL_GAP,
  layout?: PairLayoutMode,
): number {
  const colW = pairColumnWidth(contentWidth, gap);
  const leftText = `☐  ${left}`;
  const rightText = `☐  ${right}`;
  const mode = resolvePairLayout(layout, measurer, leftText, rightText, colW, WORKSHEET_CHECK_FONT_SIZE);
  if (mode === "stack") {
    const leftLines = wrappedLineCountForMeasurer(
      measurer,
      leftText,
      WORKSHEET_CHECK_FONT_SIZE,
      contentWidth,
    );
    const rightLines = wrappedLineCountForMeasurer(
      measurer,
      rightText,
      WORKSHEET_CHECK_FONT_SIZE,
      contentWidth,
    );
    return (
      WORKSHEET_CHECK_PAIR_LEADING +
      leftLines * WORKSHEET_CHECK_ROW_HEIGHT +
      rightLines * WORKSHEET_CHECK_ROW_HEIGHT +
      WORKSHEET_CHECK_ROW_TRAILING +
      WORKSHEET_CHECK_PAIR_ROW_GAP
    );
  }
  const leftLines = wrappedLineCountForMeasurer(
    measurer,
    leftText,
    WORKSHEET_CHECK_FONT_SIZE,
    colW,
  );
  const rightLines = wrappedLineCountForMeasurer(
    measurer,
    rightText,
    WORKSHEET_CHECK_FONT_SIZE,
    colW,
  );
  return (
    WORKSHEET_CHECK_PAIR_LEADING +
    Math.max(leftLines * WORKSHEET_CHECK_ROW_HEIGHT, rightLines * WORKSHEET_CHECK_ROW_HEIGHT) +
    WORKSHEET_CHECK_ROW_TRAILING +
    WORKSHEET_CHECK_PAIR_ROW_GAP
  );
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
  const textEndY = drawFieldLabelLines(ctx, label, x, maxWidth, startY);
  const ruleY = textEndY + WORKSHEET_FIELD_RULE_OFFSET;
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
  layout?: PairLayoutMode,
): number {
  const colW = pairColumnWidth(contentWidth, gap);
  const mode = resolvePairLayoutFromRender(
    ctx,
    leftLabel,
    rightLabel,
    colW,
    WORKSHEET_FIELD_FONT_SIZE,
    layout,
  );

  if (mode === "stack") {
    let y = drawLabeledFieldBlock(ctx, leftLabel, margin, contentWidth, startY);
    y = drawLabeledFieldBlock(ctx, rightLabel, margin, contentWidth, y);
    return y + WORKSHEET_PAIR_ROW_GAP;
  }

  const rightX = margin + colW + gap;
  const leftTextEnd = drawFieldLabelLines(ctx, leftLabel, margin, colW, startY);
  const rightTextEnd = drawFieldLabelLines(
    ctx,
    rightLabel,
    rightX,
    contentRight - rightX,
    startY,
  );
  const ruleY =
    Math.max(leftTextEnd, rightTextEnd) + WORKSHEET_FIELD_RULE_OFFSET;
  drawFieldRule(ctx.pdf, margin, ruleY, margin + colW);
  drawFieldRule(ctx.pdf, rightX, ruleY, contentRight);
  return ruleY + WORKSHEET_FIELD_RULE_TRAILING + WORKSHEET_PAIR_ROW_GAP;
}

export function drawCheckPairRow(
  ctx: PdfFontContext,
  left: string,
  right: string,
  margin: number,
  contentWidth: number,
  startY: number,
  gap: number,
  layout?: PairLayoutMode,
): number {
  const { pdf } = ctx;
  const colW = pairColumnWidth(contentWidth, gap);
  const leftText = `☐  ${left}`;
  const rightText = `☐  ${right}`;
  const mode = resolvePairLayoutFromRender(
    ctx,
    leftText,
    rightText,
    colW,
    WORKSHEET_CHECK_FONT_SIZE,
    layout,
  );

  setPdfFont(ctx, WORKSHEET_CHECK_FONT_SIZE, false, GUIDE_PDF_PALETTE.ink);

  if (mode === "stack") {
    let y = startY + WORKSHEET_CHECK_PAIR_LEADING;
    for (const line of wrapPdfTextLines(ctx, leftText, contentWidth)) {
      pdf.text(line, margin + WORKSHEET_FIELD_TEXT_INSET, y);
      y += WORKSHEET_CHECK_ROW_HEIGHT;
    }
    for (const line of wrapPdfTextLines(ctx, rightText, contentWidth)) {
      pdf.text(line, margin + WORKSHEET_FIELD_TEXT_INSET, y);
      y += WORKSHEET_CHECK_ROW_HEIGHT;
    }
    return y + WORKSHEET_CHECK_ROW_TRAILING + WORKSHEET_CHECK_PAIR_ROW_GAP;
  }

  const leftLines = wrapPdfTextLines(ctx, leftText, colW);
  const rightLines = wrapPdfTextLines(ctx, rightText, colW);
  let leftY = startY + WORKSHEET_CHECK_PAIR_LEADING;
  let rightY = startY + WORKSHEET_CHECK_PAIR_LEADING;
  const rightX = margin + colW + gap;
  for (const line of leftLines) {
    pdf.text(line, margin + WORKSHEET_FIELD_TEXT_INSET, leftY);
    leftY += WORKSHEET_CHECK_ROW_HEIGHT;
  }
  for (const line of rightLines) {
    pdf.text(line, rightX + WORKSHEET_FIELD_TEXT_INSET, rightY);
    rightY += WORKSHEET_CHECK_ROW_HEIGHT;
  }
  return (
    Math.max(leftY, rightY) + WORKSHEET_CHECK_ROW_TRAILING + WORKSHEET_CHECK_PAIR_ROW_GAP
  );
}
