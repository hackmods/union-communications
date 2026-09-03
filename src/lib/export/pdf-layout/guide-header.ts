import {
  CHECKLIST_HEADER_RULE_GAP_AFTER_RULE,
  CHECKLIST_HEADER_RULE_GAP_AFTER_TITLE,
  CHECKLIST_HEADER_TITLE_SIZE,
  GUIDE_PDF_PALETTE,
  WORKSHEET_HEADER_BODY_GAP,
  WORKSHEET_HEADER_RULE_GAP_AFTER_RULE,
  WORKSHEET_HEADER_RULE_GAP_AFTER_TITLE,
  WORKSHEET_HEADER_TITLE_SIZE,
  type PdfRgb,
} from "./constants";
import type { JsPdfLike, PdfFontContext } from "./types";

export function drawAccentRule(
  pdf: JsPdfLike,
  y: number,
  margin: number,
  pageWidth: number,
  accent: PdfRgb,
): number {
  pdf.setDrawColor(accent.r, accent.g, accent.b);
  pdf.setLineWidth(1.5);
  pdf.line(margin, y, pageWidth - margin, y);
  return y;
}

export function setPdfFont(
  ctx: PdfFontContext,
  size: number,
  bold: boolean,
  color: PdfRgb,
): void {
  const { pdf, faces } = ctx;
  const face = bold ? faces.headline : faces.body;
  const style =
    face === "helvetica" ? (bold ? "bold" : "normal") : bold ? "bold" : "normal";
  pdf.setFont(face, style);
  pdf.setFontSize(size);
  pdf.setTextColor(color.r, color.g, color.b);
}

export type RenderGuideHeaderOpts = {
  ctx: PdfFontContext;
  margin: number;
  pageWidth: number;
  accent: PdfRgb;
  title: string;
  subtitle?: string;
  instructions?: string;
  /** Title size in pt — worksheet uses 12, checklist/notes use 16. */
  titleSize?: number;
  ruleGapAfterTitle?: number;
  ruleGapAfterRule?: number;
  startY: number;
};

/** Preset header rhythm for compact worksheets (floor handouts). */
export const WORKSHEET_GUIDE_HEADER = {
  titleSize: WORKSHEET_HEADER_TITLE_SIZE,
  ruleGapAfterTitle: WORKSHEET_HEADER_RULE_GAP_AFTER_TITLE,
  ruleGapAfterRule: WORKSHEET_HEADER_RULE_GAP_AFTER_RULE,
  bodyGap: WORKSHEET_HEADER_BODY_GAP,
} as const;

/** Preset header rhythm for checklist / notes PDFs. */
export const CHECKLIST_GUIDE_HEADER = {
  titleSize: CHECKLIST_HEADER_TITLE_SIZE,
  ruleGapAfterTitle: CHECKLIST_HEADER_RULE_GAP_AFTER_TITLE,
  ruleGapAfterRule: CHECKLIST_HEADER_RULE_GAP_AFTER_RULE,
  bodyGap: 8,
} as const;

/**
 * Canonical guide header: mark already placed → title → accent rule → subtitle/instructions.
 * Always top-down reading order.
 */
export function renderGuideHeader(opts: RenderGuideHeaderOpts): number {
  const {
    ctx,
    margin,
    pageWidth,
    accent,
    title,
    subtitle,
    instructions,
    titleSize = 12,
    ruleGapAfterTitle = 3,
    ruleGapAfterRule = 10,
    startY,
  } = opts;
  const { pdf } = ctx;
  const { navy, muted } = GUIDE_PDF_PALETTE;
  const contentWidth = pageWidth - margin * 2;
  let y = startY;

  setPdfFont(ctx, titleSize, true, navy);
  const titleLines = pdf.splitTextToSize(title, contentWidth);
  for (const line of titleLines) {
    pdf.text(line, margin, y);
    y += titleSize + 1;
  }

  y += ruleGapAfterTitle;
  drawAccentRule(pdf, y, margin, pageWidth, accent);
  y += ruleGapAfterRule;

  if (subtitle) {
    setPdfFont(ctx, titleSize === 16 ? 10 : 8, false, muted);
    const subLines = pdf.splitTextToSize(subtitle, contentWidth);
    for (const line of subLines) {
      pdf.text(line, margin, y);
      y += (titleSize === 16 ? 10 : 8) + 1;
    }
  }

  if (instructions) {
    setPdfFont(ctx, 7.5, false, muted);
    const instrLines = pdf.splitTextToSize(instructions, contentWidth);
    for (const line of instrLines) {
      pdf.text(line, margin, y);
      y += 7.5 + 1;
    }
  }

  return y;
}

export function writePdfLines(
  ctx: PdfFontContext,
  opts: {
    text: string;
    x: number;
    y: number;
    maxWidth: number;
    size: number;
    bold: boolean;
    color: PdfRgb;
    lineGap?: number;
  },
): number {
  const lineGap = opts.lineGap ?? 3;
  setPdfFont(ctx, opts.size, opts.bold, opts.color);
  const lines = ctx.pdf.splitTextToSize(opts.text, opts.maxWidth);
  let y = opts.y;
  for (const line of lines) {
    ctx.pdf.text(line, opts.x, y);
    y += opts.size + lineGap;
  }
  return y;
}
