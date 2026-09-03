import { GUIDE_PDF_PALETTE, WORKSHEET_CLOSING_GAP, WORKSHEET_FLOW_FOOTER_GAP, WORKSHEET_RULE_ROW_DEFAULT } from "./constants";
import { renderGuideHeader, setPdfFont } from "./guide-header";
import {
  createPdfFooterMeasurer,
  measureFooterBandWithMeasurer,
  renderGuideFooterBand,
  resolveFooterTop,
} from "./guide-footer-band";
import type { JsPdfLike, PdfFontContext, WorksheetLayoutMode } from "./types";
import type { WorksheetLine, WorksheetSection } from "./worksheet-types";
import { measureWorksheetSectionBlock } from "./worksheet-measure";
import { PdfVerticalFlow } from "./vertical-flow";
import type { FooterBandMeasurer } from "./guide-footer-band";

export type RenderWorksheetContext = {
  pdf: JsPdfLike;
  fontCtx: PdfFontContext;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  contentRight: number;
  accent: import("./constants").PdfRgb;
  layoutMode: WorksheetLayoutMode;
  allowMultiPage: boolean;
  contentBottom: number;
  footerBandHeight: number;
  closingHeight: number;
  measurer: FooterBandMeasurer;
};

function drawFieldRule(pdf: JsPdfLike, x1: number, ruleY: number, x2: number): void {
  pdf.setDrawColor(190, 198, 210);
  pdf.setLineWidth(0.55);
  pdf.line(x1, ruleY, x2, ruleY);
}

function drawInlineField(
  ctx: PdfFontContext,
  label: string,
  x: number,
  maxX: number,
  fieldY: number,
): void {
  const { pdf } = ctx;
  setPdfFont(ctx, 8.5, false, GUIDE_PDF_PALETTE.ink);
  pdf.text(label, x, fieldY);
  const labelEnd = x + Math.min(pdf.getTextWidth(label) + 4, (maxX - x) * 0.42);
  drawFieldRule(pdf, labelEnd, fieldY + 1.5, maxX);
}

export function renderWorksheetLine(
  rctx: RenderWorksheetContext,
  flow: PdfVerticalFlow,
  line: WorksheetLine,
  maxY: number,
  colWidth = rctx.contentWidth,
  colOffset = 0,
): void {
  const { fontCtx, margin, contentRight } = rctx;
  const { pdf } = fontCtx;
  const { ink, navy } = GUIDE_PDF_PALETTE;
  let y = flow.y;

  const writeWrapped = (
    text: string,
    size: number,
    bold: boolean,
    color: typeof ink,
    lineGap = 3,
  ) => {
    setPdfFont(fontCtx, size, bold, color);
    const maxW = colWidth;
    const lines = pdf.splitTextToSize(text, maxW);
    for (const ln of lines) {
      if (y + size + lineGap > maxY) return;
      pdf.text(ln, margin + colOffset, y);
      y += size + lineGap;
    }
    flow.y = y;
  };

  if (y + 8 > maxY) return;

  switch (line.kind) {
    case "pageBreak": {
      if (rctx.allowMultiPage) {
        pdf.addPage();
        flow.y = rctx.margin;
      }
      break;
    }
    case "text":
      writeWrapped(line.text, 8.5, false, ink, 1);
      break;
    case "field":
    case "fieldInline": {
      drawInlineField(fontCtx, line.label, margin + colOffset, margin + colOffset + colWidth, y);
      flow.y = y + 10;
      break;
    }
    case "fieldPair": {
      const gap = 14;
      const colW = (rctx.contentWidth - gap) / 2;
      drawInlineField(fontCtx, line.left.label, margin, margin + colW, y);
      drawInlineField(fontCtx, line.right.label, margin + colW + gap, contentRight, y);
      flow.y = y + 10;
      break;
    }
    case "ruled": {
      const rowHeight = line.rowHeight ?? WORKSHEET_RULE_ROW_DEFAULT;
      let count = line.count ?? 0;
      if (line.fill) {
        const available = maxY - y;
        count = Math.max(line.minRows ?? 6, Math.floor(available / rowHeight));
        if (line.maxRows !== undefined) count = Math.min(count, line.maxRows);
      }
      for (let i = 0; i < count; i++) {
        if (y + rowHeight > maxY) break;
        y += rowHeight - 5;
        drawFieldRule(pdf, margin + colOffset, y, margin + colOffset + colWidth);
        y += 5;
      }
      flow.y = y;
      break;
    }
    case "check":
      writeWrapped(`☐  ${line.text}`, 8, false, ink, 1);
      break;
    case "checkPair": {
      const gap = 12;
      const colW = (rctx.contentWidth - gap) / 2;
      setPdfFont(fontCtx, 8, false, ink);
      const leftLines = pdf.splitTextToSize(`☐  ${line.left}`, colW);
      const rightLines = pdf.splitTextToSize(`☐  ${line.right}`, colW);
      const rows = Math.max(leftLines.length, rightLines.length);
      for (let i = 0; i < rows; i++) {
        if (y + 9 > maxY) break;
        if (leftLines[i]) pdf.text(leftLines[i]!, margin, y);
        if (rightLines[i]) pdf.text(rightLines[i]!, margin + colW + gap, y);
        y += 9;
      }
      flow.y = y;
      break;
    }
    case "table": {
      const rowHeight = line.rowHeight ?? 14;
      const colCount = line.headers.length;
      const colW = colWidth / colCount;
      setPdfFont(fontCtx, 7.5, true, navy);
      for (let c = 0; c < colCount; c++) {
        pdf.text(line.headers[c]!, margin + colOffset + c * colW, y);
      }
      y += rowHeight;
      setPdfFont(fontCtx, 7.5, false, ink);
      for (let r = 0; r < line.rows; r++) {
        if (y + rowHeight > maxY) break;
        for (let c = 0; c < colCount; c++) {
          drawFieldRule(
            pdf,
            margin + colOffset + c * colW,
            y + rowHeight - 4,
            margin + colOffset + (c + 1) * colW - 4,
          );
        }
        y += rowHeight;
      }
      flow.y = y;
      break;
    }
    case "columnLayout": {
      const gap = line.gap ?? 12;
      const cols = line.columns.length;
      const colW = (rctx.contentWidth - gap * (cols - 1)) / cols;
      const startY = y;
      let maxEnd = y;
      for (let c = 0; c < cols; c++) {
        flow.y = startY;
        for (const inner of line.columns[c]!.lines) {
          renderWorksheetLine(rctx, flow, inner, maxY, colW, c * (colW + gap));
        }
        maxEnd = Math.max(maxEnd, flow.y);
      }
      flow.y = maxEnd;
      break;
    }
  }
}

export function renderWorksheetSections(
  rctx: RenderWorksheetContext,
  flow: PdfVerticalFlow,
  sections: WorksheetSection[],
  maxY: number,
): void {
  const { fontCtx, margin, contentWidth } = rctx;
  const { muted, navy } = GUIDE_PDF_PALETTE;

  for (const section of sections) {
    if (flow.y + 12 > maxY) break;
    if (section.pageBreak === "avoid" && rctx.allowMultiPage) {
      flow.ensureSpace(40, "avoid");
    }
    flow.advance(2);
    setPdfFont(fontCtx, 9.5, true, navy);
    const headingLines = rctx.pdf.splitTextToSize(section.heading, contentWidth);
    for (const ln of headingLines) {
      if (flow.y + 10 > maxY) break;
      rctx.pdf.text(ln, margin, flow.y);
      flow.advance(9.5 + 1);
    }
    if (section.intro) {
      setPdfFont(fontCtx, 7.5, false, muted);
      const introLines = rctx.pdf.splitTextToSize(section.intro, contentWidth);
      for (const ln of introLines) {
        if (flow.y + 8 > maxY) break;
        rctx.pdf.text(ln, margin, flow.y);
        flow.advance(7.5);
      }
    }
    for (const line of section.lines) {
      if (line.kind === "pageBreak" && rctx.allowMultiPage) {
        rctx.pdf.addPage();
        flow.y = rctx.margin;
        continue;
      }
      renderWorksheetLine(rctx, flow, line, maxY);
    }
  }
}

export type WriteWorksheetBodyOpts = {
  pdf: JsPdfLike;
  fontCtx: PdfFontContext;
  margin: number;
  accent: import("./constants").PdfRgb;
  title: string;
  subtitle?: string;
  instructions?: string;
  sections: WorksheetSection[];
  closingSections?: WorksheetSection[];
  footer: string;
  reminder?: string;
  tips?: { heading: string; lines: readonly string[] };
  layoutMode: WorksheetLayoutMode;
  allowMultiPage?: boolean;
  markStartY: number;
};

export function renderWorksheetDocument(opts: WriteWorksheetBodyOpts): number {
  const {
    pdf,
    fontCtx,
    margin,
    accent,
    layoutMode,
    allowMultiPage = false,
  } = opts;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentRight = pageWidth - margin;
  const contentWidth = contentRight - margin;

  const measurer = createPdfFooterMeasurer(fontCtx, contentWidth);
  const footerBandHeight = measureFooterBandWithMeasurer(
    measurer,
    { footer: opts.footer, reminder: opts.reminder, tips: opts.tips },
    contentWidth,
  );

  const closingHeight = opts.closingSections?.length
    ? measureWorksheetSectionBlock(
        { wrappedLineCount: measurer.wrappedLineCount },
        opts.closingSections,
        contentWidth,
      ) + WORKSHEET_CLOSING_GAP
    : 0;

  const pinFooterToPageBottom =
    layoutMode === "pinnedFooter" || layoutMode === "pinnedClosing";

  const contentBottom =
    pageHeight - margin - footerBandHeight - closingHeight - WORKSHEET_CLOSING_GAP;

  const rctx: RenderWorksheetContext = {
    pdf,
    fontCtx,
    margin,
    pageWidth,
    pageHeight,
    contentWidth,
    contentRight,
    accent,
    layoutMode,
    allowMultiPage,
    contentBottom,
    footerBandHeight,
    closingHeight,
    measurer,
  };

  let y = renderGuideHeader({
    ctx: fontCtx,
    margin,
    pageWidth,
    accent,
    title: opts.title,
    subtitle: opts.subtitle,
    instructions: opts.instructions,
    titleSize: 12,
    startY: opts.markStartY,
  });
  y += WORKSHEET_FLOW_FOOTER_GAP - 10;

  const flow = new PdfVerticalFlow({
    pdf,
    margin,
    pageHeight,
    footerReserve: footerBandHeight + closingHeight + WORKSHEET_CLOSING_GAP,
    allowMultiPage,
    startY: y,
  });

  renderWorksheetSections(rctx, flow, opts.sections, contentBottom);

  if (opts.closingSections?.length && layoutMode === "pinnedClosing") {
    flow.setY(pageHeight - margin - footerBandHeight - closingHeight + WORKSHEET_CLOSING_GAP);
    renderWorksheetSections(
      rctx,
      flow,
      opts.closingSections,
      pageHeight - margin - footerBandHeight,
    );
  }

  const footerTop = resolveFooterTop({
    pinToPageBottom: pinFooterToPageBottom,
    pageHeight,
    margin,
    footerBandHeight,
    bodyEndY: flow.y,
    flowGap: WORKSHEET_FLOW_FOOTER_GAP,
  });

  renderGuideFooterBand({
    ctx: fontCtx,
    margin,
    contentWidth,
    footerTop,
    band: {
      footer: opts.footer,
      reminder: opts.reminder,
      tips: opts.tips,
    },
  });

  return footerTop;
}

export { renderGuideHeader };
