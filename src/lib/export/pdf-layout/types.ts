import type { PdfRgb } from "./constants";

/** jsPDF subset used by guide text PDF writers. */
export type JsPdfLike = {
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  setFont: (name: string, style: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setLineWidth: (w: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  text: (text: string, x: number, y: number, opts?: { align?: string; maxWidth?: number }) => void;
  getTextWidth: (text: string) => number;
  splitTextToSize: (text: string, maxWidth: number) => string[];
  addPage: () => void;
  addImage: (
    imageData: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
  addFileToVFS?: (filename: string, filecontent: string) => void;
  addFont?: (postScriptName: string, id: string, fontStyle: string) => string;
  output: (type: "blob") => Blob;
};

export type GuidePdfFontFaces = {
  headline: string;
  body: string;
  custom: boolean;
};

/** Worksheet vertical layout strategy. */
export type WorksheetLayoutMode = "flow" | "pinnedFooter" | "pinnedClosing";

export type GuideFooterBandContent = {
  footer: string;
  reminder?: string;
  tips?: { heading: string; lines: readonly string[] };
};

export type GuideHeaderContent = {
  title: string;
  subtitle?: string;
  instructions?: string;
};

export type PdfPageBox = {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  contentRight: number;
};

export type PdfFontContext = {
  pdf: JsPdfLike;
  faces: GuidePdfFontFaces;
};

export type PdfWriteStyle = {
  size: number;
  bold: boolean;
  color: PdfRgb;
  lineGap?: number;
};

export type VerticalFlowPageBreak = "avoid" | "auto";
