import { GUIDE_PDF_PALETTE } from "./constants";
import type { PdfFontContext } from "./types";
import type { JsPdfLike } from "./types";
import { setPdfFont } from "./guide-header";

const FIELD_FONT_SIZE = 8.5;
const FIELD_LINE_GAP = 1;
const RULE_OFFSET = 2;

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
  setPdfFont(ctx, FIELD_FONT_SIZE, false, GUIDE_PDF_PALETTE.ink);
  const lines = pdf.splitTextToSize(label, maxWidth);
  let y = startY;
  for (const line of lines) {
    pdf.text(line, x, y);
    y += FIELD_FONT_SIZE + FIELD_LINE_GAP;
  }
  const ruleY = y + RULE_OFFSET;
  drawFieldRule(pdf, x, ruleY, x + maxWidth);
  return ruleY + 4;
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
  setPdfFont(ctx, 8, false, GUIDE_PDF_PALETTE.ink);
  const leftLines = pdf.splitTextToSize(`☐  ${left}`, colW);
  const rightLines = pdf.splitTextToSize(`☐  ${right}`, colW);
  const rows = Math.max(leftLines.length, rightLines.length);
  let y = startY;
  for (let i = 0; i < rows; i++) {
    if (leftLines[i]) pdf.text(leftLines[i]!, margin, y);
    if (rightLines[i]) pdf.text(rightLines[i]!, margin + colW + gap, y);
    y += 9;
  }
  return y + 2;
}
