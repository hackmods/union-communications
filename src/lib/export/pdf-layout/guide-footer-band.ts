import { GUIDE_PDF_PALETTE } from "./constants";
import { setPdfFont } from "./guide-header";
import type { GuideFooterBandContent, JsPdfLike, PdfFontContext } from "./types";
import { createStaticTextMeasurer, measureFooterBandHeight } from "./worksheet-measure";

export type FooterBandMeasurer = {
  wrappedLineCount: (text: string, size: number, maxW: number) => number;
};

export function createPdfFooterMeasurer(ctx: PdfFontContext, contentWidth: number): FooterBandMeasurer {
  const { pdf } = ctx;
  return {
    wrappedLineCount(text: string, size: number, maxW: number) {
      setPdfFont(ctx, size, false, GUIDE_PDF_PALETTE.ink);
      return pdf.splitTextToSize(text, maxW).length;
    },
  };
}

/**
 * Render footer band top-down: tips heading → bullets → reminder → education disclaimer.
 */
export function renderGuideFooterBand(opts: {
  ctx: PdfFontContext;
  margin: number;
  contentWidth: number;
  footerTop: number;
  band: GuideFooterBandContent;
}): number {
  const { ctx, margin, contentWidth, band } = opts;
  const { pdf } = ctx;
  const { navy, muted, ink } = GUIDE_PDF_PALETTE;
  let bandY = opts.footerTop;

  if (band.tips?.lines.length) {
    setPdfFont(ctx, 7.5, true, navy);
    pdf.text(band.tips.heading, margin, bandY);
    bandY += 9;
    setPdfFont(ctx, 7.5, false, ink);
    for (const tip of band.tips.lines) {
      const tipLines = pdf.splitTextToSize(`• ${tip}`, contentWidth);
      for (const tipLine of tipLines) {
        pdf.text(tipLine, margin, bandY);
        bandY += 8;
      }
    }
    bandY += 2;
  }

  if (band.reminder) {
    setPdfFont(ctx, 7, false, muted);
    const reminderLines = pdf.splitTextToSize(band.reminder, contentWidth);
    for (const reminderLine of reminderLines) {
      pdf.text(reminderLine, margin, bandY);
      bandY += 8;
    }
    bandY += 2;
  }

  setPdfFont(ctx, 7, false, muted);
  const footerLines = pdf.splitTextToSize(band.footer, contentWidth);
  for (const footerLine of footerLines) {
    pdf.text(footerLine, margin, bandY);
    bandY += 8;
  }

  return bandY;
}

export function resolveFooterTop(opts: {
  pinToPageBottom: boolean;
  pageHeight: number;
  margin: number;
  footerBandHeight: number;
  bodyEndY: number;
  flowGap: number;
}): number {
  if (opts.pinToPageBottom) {
    return opts.pageHeight - opts.margin - opts.footerBandHeight;
  }
  return opts.bodyEndY + opts.flowGap;
}

export function measureFooterBandWithMeasurer(
  measurer: FooterBandMeasurer,
  band: GuideFooterBandContent,
  contentWidth: number,
): number {
  return measureFooterBandHeight(
    { wrappedLineCount: measurer.wrappedLineCount },
    band,
    contentWidth,
  );
}

export function staticFooterBandHeight(
  band: GuideFooterBandContent,
  contentWidth: number,
): number {
  return measureFooterBandHeight(createStaticTextMeasurer(contentWidth), band, contentWidth);
}

export type { JsPdfLike };
