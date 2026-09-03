import type { JsPdfLike, PdfFontContext, VerticalFlowPageBreak } from "./types";

export type VerticalFlowOpts = {
  pdf: JsPdfLike;
  margin: number;
  pageHeight: number;
  footerReserve?: number;
  allowMultiPage?: boolean;
};

/**
 * Top-down vertical cursor with optional pagination.
 * jsPDF Y increases downward — this class owns the cursor only.
 */
export class PdfVerticalFlow {
  readonly margin: number;
  readonly pageHeight: number;
  readonly footerReserve: number;
  readonly allowMultiPage: boolean;
  readonly pdf: JsPdfLike;
  y: number;

  constructor(opts: VerticalFlowOpts & { startY: number }) {
    this.pdf = opts.pdf;
    this.margin = opts.margin;
    this.pageHeight = opts.pageHeight;
    this.footerReserve = opts.footerReserve ?? 28;
    this.allowMultiPage = opts.allowMultiPage ?? false;
    this.y = opts.startY;
  }

  get maxY(): number {
    return this.pageHeight - this.margin - this.footerReserve;
  }

  ensureSpace(needed: number, pageBreak: VerticalFlowPageBreak = "auto"): boolean {
    if (this.y + needed <= this.maxY) return true;
    if (!this.allowMultiPage || pageBreak === "avoid") return false;
    this.pdf.addPage();
    this.y = this.margin;
    return true;
  }

  advance(delta: number): void {
    this.y += delta;
  }

  setY(next: number): void {
    this.y = next;
  }
}
