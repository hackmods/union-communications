/**
 * Shared chrome for guide / Officer Learning / steward text PDFs.
 * Platform mark = UnionOps interlock PNG; Brand Kit faces/palette when provided.
 * Dynamic-import jsPDF at call sites (TOOL-004).
 */

import {
  DEFAULT_BODY_FONT,
  DEFAULT_HEADLINE_FONT,
  canvasFontOfficeName,
  canvasPdfFontWeights,
  isCanvasFontId,
  loadCanvasFontBinary,
  migrateCanvasFontId,
  type CanvasFontId,
} from "@/lib/comms/canvas-fonts";
import { UNIONOPS_LOGOS } from "@/lib/constants/unionPresets";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";
import { saveBlob } from "@/lib/export/save-blob";
import type { BrandKit } from "@/types/entities";
import { hexToRgb } from "@/lib/utils/contrast";

export const GUIDE_PDF_PALETTE = {
  navy: { r: 11, g: 19, b: 43 },
  /** Platform brand orange — OL certificates + default guide PDF accent */
  brand: { r: 194, g: 65, b: 12 },
  brandLight: { r: 251, g: 146, b: 60 },
  /** @deprecated alias — use brand */
  teal: { r: 194, g: 65, b: 12 },
  /** @deprecated alias — use brandLight */
  amber: { r: 251, g: 146, b: 60 },
  ink: { r: 15, g: 23, b: 42 },
  muted: { r: 71, g: 85, b: 105 },
} as const;

export type PdfRgb = { r: number; g: number; b: number };

export const EDUCATION_FOOTER = {
  en: "UnionOps Officer Learning — education only. Confirm every step against your collective agreement. Not legal advice.",
  fr: "UnionOps Formation des dirigeants — formation seulement. Vérifiez chaque étape avec votre convention collective. Pas un avis juridique.",
} as const;

export type GuidePdfLocale = keyof typeof EDUCATION_FOOTER;

export const STEWARD_WORKSPACE_FOOTER = {
  en: "UnionOps steward workspace — education and notes on this device. Confirm practice against your collective agreement. Not legal advice.",
  fr: "UnionOps espace délégué — notes et formation sur cet appareil. Vérifiez la pratique avec votre convention collective. Pas un avis juridique.",
} as const;

export const COMMS_GUIDE_FOOTER = {
  en: "UnionOps Comms — shop-floor reference. Confirm posters and links against current ministry pages. Not legal advice.",
  fr: "UnionOps Communications — référence sur le plancher. Vérifiez affiches et liens sur les pages ministérielles à jour. Pas un avis juridique.",
} as const;

/** Optional Brand Kit styling for text PDFs. */
export type GuidePdfBrand = {
  primaryColor?: string;
  headlineFontId?: CanvasFontId;
  bodyFontId?: CanvasFontId;
};

/** Brand fonts resolved from a kit — always has canvas font ids. */
export type GuidePdfBrandResolved = GuidePdfBrand & {
  headlineFontId: CanvasFontId;
  bodyFontId: CanvasFontId;
};

export function guidePdfBrandFromKit(kit: BrandKit): GuidePdfBrandResolved {
  const headline =
    migrateCanvasFontId(kit.canvas?.headlineFontId) ?? DEFAULT_HEADLINE_FONT;
  const body =
    migrateCanvasFontId(kit.canvas?.bodyFontId) ?? DEFAULT_BODY_FONT;
  return {
    primaryColor: kit.primaryColor,
    headlineFontId: isCanvasFontId(headline) ? headline : DEFAULT_HEADLINE_FONT,
    bodyFontId: isCanvasFontId(body) ? body : DEFAULT_BODY_FONT,
  };
}

export function resolveGuidePdfAccent(brand?: GuidePdfBrand | null): PdfRgb {
  if (brand?.primaryColor) {
    const rgb = hexToRgb(brand.primaryColor);
    if (rgb) return rgb;
  }
  return GUIDE_PDF_PALETTE.brand;
}

export type PdfImageBytes = {
  bytes: Uint8Array;
  widthPx: number;
  heightPx: number;
  src: string;
};

function bytesToPngDataUrl(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function logoDataUrlFromBytes(logo: PdfImageBytes | BrandLogoBytes): string {
  if (logo.src.startsWith("data:")) return logo.src;
  return bytesToPngDataUrl(logo.bytes);
}

export function guidePdfMarkPlacementPt(
  logo: PdfImageBytes | BrandLogoBytes | null | undefined,
  opts?: { maxW?: number; maxH?: number; x?: number; y?: number },
): { draw: boolean; x: number; y: number; widthPt: number; heightPt: number } | null {
  if (!logo?.bytes?.length) return null;
  const maxW = opts?.maxW ?? 72;
  const maxH = opts?.maxH ?? 36;
  const aspect =
    logo.widthPx > 0 && logo.heightPx > 0
      ? logo.widthPx / logo.heightPx
      : 2.4;
  let widthPt = maxW;
  let heightPt = widthPt / aspect;
  if (heightPt > maxH) {
    heightPt = maxH;
    widthPt = heightPt * aspect;
  }
  return {
    draw: true,
    x: opts?.x ?? 48,
    y: opts?.y ?? 36,
    widthPt,
    heightPt,
  };
}

/** Compact header mark for fill-in worksheets (tighter margins). */
export function guidePdfWorksheetMarkPlacementPt(
  logo: PdfImageBytes | BrandLogoBytes | null | undefined,
  margin: number,
): { draw: boolean; x: number; y: number; widthPt: number; heightPt: number } | null {
  return guidePdfMarkPlacementPt(logo, {
    maxW: 52,
    maxH: 26,
    x: margin,
    y: 24,
  });
}

export function certificatePlatformMarkPlacement(
  logo: PdfImageBytes | BrandLogoBytes | null | undefined,
): { draw: boolean; x: number; y: number; widthIn: number; heightIn: number } | null {
  if (!logo?.bytes?.length) return null;
  const maxW = 0.95;
  const maxH = 0.42;
  const aspect =
    logo.widthPx > 0 && logo.heightPx > 0
      ? logo.widthPx / logo.heightPx
      : 2.4;
  let widthIn = maxW;
  let heightIn = widthIn / aspect;
  if (heightIn > maxH) {
    heightIn = maxH;
    widthIn = heightIn * aspect;
  }
  return { draw: true, x: 0.55, y: 0.55, widthIn, heightIn };
}

export function certificateBrandLogoPlacement(
  logo: BrandLogoBytes | null | undefined,
  opts?: { withPlatformMark?: boolean },
): { draw: boolean; x: number; y: number; widthIn: number; heightIn: number } | null {
  if (!logo?.bytes?.length) return null;
  const maxW = 1.35;
  const maxH = 0.55;
  const aspect =
    logo.widthPx > 0 && logo.heightPx > 0
      ? logo.widthPx / logo.heightPx
      : 2.4;
  let widthIn = maxW;
  let heightIn = widthIn / aspect;
  if (heightIn > maxH) {
    heightIn = maxH;
    widthIn = heightIn * aspect;
  }
  const withPlatform = opts?.withPlatformMark ?? false;
  const x = withPlatform ? 11 - 0.65 - widthIn : 0.65;
  return { draw: true, x, y: 0.65, widthIn, heightIn };
}

async function fetchPngBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function resolveUnionOpsMarkBytes(): Promise<PdfImageBytes | null> {
  const src = UNIONOPS_LOGOS.markInterlock;
  const bytes = await fetchPngBytes(src);
  if (!bytes?.length) return null;
  return {
    bytes,
    widthPx: 192,
    heightPx: 96,
    src: bytesToPngDataUrl(bytes),
  };
}

type JsPdfLike = {
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

const HEADLINE_FACE = "UnionOpsHeadline";
const BODY_FACE = "UnionOpsBody";

/** Register Brand Kit TTFs on a jsPDF instance; fall back to Helvetica. */
export async function registerGuidePdfFonts(
  pdf: JsPdfLike,
  brand?: GuidePdfBrand | null,
): Promise<GuidePdfFontFaces> {
  const headlineId = brand?.headlineFontId ?? DEFAULT_HEADLINE_FONT;
  const bodyId = brand?.bodyFontId ?? DEFAULT_BODY_FONT;
  const weights = {
    headline: canvasPdfFontWeights(headlineId).headline,
    body: canvasPdfFontWeights(bodyId).body,
  };

  const tryRegister = async (
    id: CanvasFontId,
    weight: number,
    vfsName: string,
    faceId: string,
    style: "normal" | "bold",
  ) => {
    if (!pdf.addFileToVFS || !pdf.addFont) return false;
    const bytes = await loadCanvasFontBinary(id, weight, "ttf");
    if (!bytes?.length) return false;
    pdf.addFileToVFS(vfsName, bytesToBase64(bytes));
    pdf.addFont(vfsName, faceId, style);
    return true;
  };

  const headlineOk = await tryRegister(
    headlineId,
    weights.headline,
    `${canvasFontOfficeName(headlineId).replace(/\s+/g, "")}-${weights.headline}.ttf`,
    HEADLINE_FACE,
    "bold",
  );
  const bodyOk = await tryRegister(
    bodyId,
    weights.body,
    `${canvasFontOfficeName(bodyId).replace(/\s+/g, "")}-${weights.body}.ttf`,
    BODY_FACE,
    "normal",
  );
  if (bodyOk && !headlineOk) {
    const boldWeight = canvasPdfFontWeights(bodyId).headline;
    await tryRegister(
      bodyId,
      boldWeight,
      `${canvasFontOfficeName(bodyId).replace(/\s+/g, "")}-${boldWeight}-bold.ttf`,
      HEADLINE_FACE,
      "bold",
    );
  }

  return {
    headline: headlineOk ? HEADLINE_FACE : "helvetica",
    body: bodyOk ? BODY_FACE : "helvetica",
    custom: headlineOk || bodyOk,
  };
}

async function createLetterPdf(): Promise<JsPdfLike> {
  const { jsPDF } = await import("jspdf");
  return new jsPDF({ unit: "pt", format: "letter" }) as unknown as JsPdfLike;
}

function drawAccentRule(
  pdf: JsPdfLike,
  y: number,
  margin: number,
  pageWidth: number,
  accent: PdfRgb,
): void {
  pdf.setDrawColor(accent.r, accent.g, accent.b);
  pdf.setLineWidth(1.5);
  pdf.line(margin, y, pageWidth - margin, y);
}

export async function writeBrandedChecklistPdf(opts: {
  title: string;
  subtitle?: string;
  sections: { heading: string; lines: string[] }[];
  filename: string;
  footer: string;
  platformMark?: PdfImageBytes | null;
  brand?: GuidePdfBrand | null;
}): Promise<void> {
  const pdf = await createLetterPdf();
  const faces = await registerGuidePdfFonts(pdf, opts.brand);
  const margin = 48;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const { ink, muted, navy } = GUIDE_PDF_PALETTE;
  const accent = resolveGuidePdfAccent(opts.brand);

  const mark =
    opts.platformMark === undefined
      ? await resolveUnionOpsMarkBytes()
      : opts.platformMark;
  const placement = guidePdfMarkPlacementPt(mark);

  let y = margin;
  if (placement && mark) {
    try {
      pdf.addImage(
        logoDataUrlFromBytes(mark),
        "PNG",
        placement.x,
        placement.y,
        placement.widthPt,
        placement.heightPt,
      );
      y = placement.y + placement.heightPt + 14;
    } catch {
      y = margin;
    }
  }

  drawAccentRule(pdf, y, margin, pageWidth, accent);
  y += 16;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin - 28) {
      pdf.addPage();
      y = margin;
    }
  };

  const write = (text: string, size: number, bold: boolean, color: PdfRgb) => {
    const face = bold ? faces.headline : faces.body;
    const style =
      face === "helvetica" ? (bold ? "bold" : "normal") : bold ? "bold" : "normal";
    pdf.setFont(face, style);
    pdf.setFontSize(size);
    pdf.setTextColor(color.r, color.g, color.b);
    const lines = pdf.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      ensureSpace(size + 5);
      pdf.text(line, margin, y);
      y += size + 5;
    }
  };

  write(opts.title, 16, true, navy);
  y += 4;
  if (opts.subtitle) {
    write(opts.subtitle, 10, false, muted);
    y += 8;
  }

  for (const section of opts.sections) {
    y += 6;
    write(section.heading, 12, true, navy);
    y += 2;
    for (const line of section.lines) {
      write(`☐  ${line}`, 10, false, ink);
    }
  }

  y += 16;
  ensureSpace(24);
  write(opts.footer, 8, false, muted);
  await saveBlob(pdf.output("blob"), opts.filename);
}

/** Fill-in worksheet line — ruled rows, fields, checks, or plain prompts. */
export type WorksheetLine =
  | { kind: "text"; text: string }
  | { kind: "field"; label: string }
  | { kind: "fieldInline"; label: string }
  | { kind: "fieldPair"; left: { label: string }; right: { label: string } }
  | {
      kind: "ruled";
      count?: number;
      rowHeight?: number;
      /** Grow ruled rows to consume space above the reserved footer band. */
      fill?: boolean;
      minRows?: number;
      reserveBottom?: number;
    }
  | { kind: "check"; text: string }
  | { kind: "checkPair"; left: string; right: string };

export type WorksheetSection = {
  heading: string;
  /** One-line prompt under the section heading (muted). */
  intro?: string;
  lines: WorksheetLine[];
};

const WORKSHEET_MARGIN_DEFAULT = 18;
const WORKSHEET_RULE_ROW_DEFAULT = 20;

export async function writeBrandedWorksheetPdf(opts: {
  title: string;
  subtitle?: string;
  /** How to use this sheet — printed under the subtitle. */
  instructions?: string;
  /** Flowing body sections — may include `{ kind: "ruled", fill: true }` to grow draft space. */
  sections: WorksheetSection[];
  /** Checklist / sign-off block pinned above the footer band (not in the fill zone). */
  closingSections?: WorksheetSection[];
  /** Short floor tips before the reminder. */
  tips?: { heading: string; lines: readonly string[] };
  /** Short reminder printed above the footer — saves a section heading. */
  reminder?: string;
  filename: string;
  footer: string;
  platformMark?: PdfImageBytes | null;
  brand?: GuidePdfBrand | null;
  margin?: number;
}): Promise<void> {
  const pdf = await createLetterPdf();
  const faces = await registerGuidePdfFonts(pdf, opts.brand);
  const margin = opts.margin ?? WORKSHEET_MARGIN_DEFAULT;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentRight = pageWidth - margin;
  const contentWidth = contentRight - margin;
  const { ink, muted, navy } = GUIDE_PDF_PALETTE;
  const accent = resolveGuidePdfAccent(opts.brand);

  const setBodyFont = (size: number, bold: boolean, color: PdfRgb) => {
    const face = bold ? faces.headline : faces.body;
    const style =
      face === "helvetica" ? (bold ? "bold" : "normal") : bold ? "bold" : "normal";
    pdf.setFont(face, style);
    pdf.setFontSize(size);
    pdf.setTextColor(color.r, color.g, color.b);
  };

  const wrappedLineCount = (text: string, size: number, maxW: number) => {
    setBodyFont(size, false, ink);
    return pdf.splitTextToSize(text, maxW).length;
  };

  const measureWrapped = (text: string, size: number, lineGap: number, maxW: number) =>
    wrappedLineCount(text, size, maxW) * (size + lineGap);

  const measureLine = (line: WorksheetLine, colW = contentWidth): number => {
    switch (line.kind) {
      case "text":
        return measureWrapped(line.text, 8.5, 1, colW);
      case "field":
      case "fieldInline":
        return 10;
      case "fieldPair":
        return 10;
      case "ruled": {
        const rowHeight = line.rowHeight ?? WORKSHEET_RULE_ROW_DEFAULT;
        const count = line.fill
          ? line.minRows ?? 6
          : line.count ?? 0;
        return count * rowHeight;
      }
      case "check":
        return measureWrapped(`☐  ${line.text}`, 8, 1, colW);
      case "checkPair": {
        const half = (colW - 12) / 2;
        const leftH = measureWrapped(`☐  ${line.left}`, 8, 1, half);
        const rightH = measureWrapped(`☐  ${line.right}`, 8, 1, half);
        return Math.max(leftH, rightH);
      }
    }
  };

  const measureSectionBlock = (sections: WorksheetSection[]): number => {
    let h = 0;
    for (const section of sections) {
      h += 3;
      h += 9.5 + 1;
      if (section.intro) h += measureWrapped(section.intro, 7.5, 0, contentWidth);
      for (const line of section.lines) {
        h += measureLine(line);
      }
    }
    return h;
  };

  const measureFooterBand = (): number => {
    let h = 0;
    h += wrappedLineCount(opts.footer, 7, contentWidth) * 8;
    if (opts.reminder) {
      h += 2;
      h += wrappedLineCount(opts.reminder, 7, contentWidth) * 8;
    }
    if (opts.tips?.lines.length) {
      h += 2 + 9;
      for (const tip of opts.tips.lines) {
        h += wrappedLineCount(`• ${tip}`, 7.5, contentWidth) * 8;
      }
    }
    return h;
  };

  const footerBandHeight = measureFooterBand();
  const closingHeight = opts.closingSections?.length
    ? measureSectionBlock(opts.closingSections) + 4
    : 0;
  const contentBottom =
    pageHeight - margin - footerBandHeight - closingHeight - 4;

  const mark =
    opts.platformMark === undefined
      ? await resolveUnionOpsMarkBytes()
      : opts.platformMark;
  const placement = guidePdfWorksheetMarkPlacementPt(mark, margin);

  let y = margin;
  if (placement && mark) {
    try {
      pdf.addImage(
        logoDataUrlFromBytes(mark),
        "PNG",
        placement.x,
        placement.y,
        placement.widthPt,
        placement.heightPt,
      );
      y = placement.y + placement.heightPt + 5;
    } catch {
      y = 24;
    }
  }

  drawAccentRule(pdf, y, margin, pageWidth, accent);
  y += 7;

  const drawRule = (x1: number, ruleY: number, x2: number) => {
    pdf.setDrawColor(190, 198, 210);
    pdf.setLineWidth(0.55);
    pdf.line(x1, ruleY, x2, ruleY);
  };

  const drawInlineField = (label: string, x: number, maxX: number, fieldY: number) => {
    setBodyFont(8.5, false, ink);
    pdf.text(label, x, fieldY);
    const labelEnd = x + Math.min(pdf.getTextWidth(label) + 4, (maxX - x) * 0.42);
    drawRule(labelEnd, fieldY + 1.5, maxX);
  };

  const writeWrapped = (
    text: string,
    size: number,
    bold: boolean,
    color: PdfRgb,
    lineGap = 3,
    maxY = contentBottom,
  ) => {
    setBodyFont(size, bold, color);
    const lines = pdf.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      if (y + size + lineGap > maxY) break;
      pdf.text(line, margin, y);
      y += size + lineGap;
    }
  };

  const renderLine = (line: WorksheetLine, maxY = contentBottom) => {
    if (y + 8 > maxY) return;
    switch (line.kind) {
      case "text": {
        writeWrapped(line.text, 8.5, false, ink, 1, maxY);
        break;
      }
      case "field":
      case "fieldInline": {
        drawInlineField(line.label, margin, contentRight, y);
        y += 10;
        break;
      }
      case "fieldPair": {
        const gap = 14;
        const colW = (contentWidth - gap) / 2;
        const leftMax = margin + colW;
        const rightX = margin + colW + gap;
        drawInlineField(line.left.label, margin, leftMax, y);
        drawInlineField(line.right.label, rightX, contentRight, y);
        y += 10;
        break;
      }
      case "ruled": {
        const rowHeight = line.rowHeight ?? WORKSHEET_RULE_ROW_DEFAULT;
        let count = line.count ?? 0;
        if (line.fill) {
          const available = maxY - y;
          count = Math.max(line.minRows ?? 6, Math.floor(available / rowHeight));
        }
        for (let i = 0; i < count; i++) {
          if (y + rowHeight > maxY) break;
          y += rowHeight - 5;
          drawRule(margin, y, contentRight);
          y += 5;
        }
        break;
      }
      case "check": {
        writeWrapped(`☐  ${line.text}`, 8, false, ink, 1, maxY);
        break;
      }
      case "checkPair": {
        const gap = 12;
        const colW = (contentWidth - gap) / 2;
        setBodyFont(8, false, ink);
        const leftLines = pdf.splitTextToSize(`☐  ${line.left}`, colW);
        const rightLines = pdf.splitTextToSize(`☐  ${line.right}`, colW);
        const rows = Math.max(leftLines.length, rightLines.length);
        for (let i = 0; i < rows; i++) {
          if (y + 9 > maxY) break;
          if (leftLines[i]) pdf.text(leftLines[i]!, margin, y);
          if (rightLines[i]) {
            pdf.text(rightLines[i]!, margin + colW + gap, y);
          }
          y += 9;
        }
        break;
      }
    }
  };

  const renderSections = (sections: WorksheetSection[], maxY: number) => {
    for (const section of sections) {
      if (y + 12 > maxY) break;
      y += 3;
      writeWrapped(section.heading, 9.5, true, navy, 1, maxY);
      if (section.intro) {
        writeWrapped(section.intro, 7.5, false, muted, 0, maxY);
      }
      for (const line of section.lines) {
        renderLine(line, maxY);
      }
    }
  };

  writeWrapped(opts.title, 12, true, navy, 1);
  if (opts.subtitle) {
    writeWrapped(opts.subtitle, 8, false, muted, 1);
  }
  if (opts.instructions) {
    writeWrapped(opts.instructions, 7.5, false, muted, 1);
  }
  y += 2;

  renderSections(opts.sections, contentBottom);

  if (opts.closingSections?.length) {
    y = pageHeight - margin - footerBandHeight - closingHeight + 4;
    renderSections(opts.closingSections, pageHeight - margin - footerBandHeight);
  }

  let bandY = pageHeight - margin;
  setBodyFont(7, false, muted);
  const footerLines = pdf.splitTextToSize(opts.footer, contentWidth);
  for (let i = footerLines.length - 1; i >= 0; i--) {
    pdf.text(footerLines[i]!, margin, bandY);
    bandY -= 8;
  }

  if (opts.reminder) {
    bandY -= 2;
    const reminderLines = pdf.splitTextToSize(opts.reminder, contentWidth);
    for (let i = reminderLines.length - 1; i >= 0; i--) {
      pdf.text(reminderLines[i]!, margin, bandY);
      bandY -= 8;
    }
  }

  if (opts.tips?.lines.length) {
    bandY -= 2;
    setBodyFont(7.5, true, navy);
    pdf.text(opts.tips.heading, margin, bandY);
    bandY -= 9;
    setBodyFont(7.5, false, ink);
    for (let i = opts.tips.lines.length - 1; i >= 0; i--) {
      const tipLines = pdf.splitTextToSize(`• ${opts.tips.lines[i]!}`, contentWidth);
      for (let j = tipLines.length - 1; j >= 0; j--) {
        pdf.text(tipLines[j]!, margin, bandY);
        bandY -= 8;
      }
    }
  }

  await saveBlob(pdf.output("blob"), opts.filename);
}

export async function writeBrandedNotesPdf(opts: {
  title: string;
  body: string;
  filename: string;
  footer?: string;
  platformMark?: PdfImageBytes | null;
  brand?: GuidePdfBrand | null;
}): Promise<void> {
  const pdf = await createLetterPdf();
  const faces = await registerGuidePdfFonts(pdf, opts.brand);
  const margin = 48;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const { ink, muted, navy } = GUIDE_PDF_PALETTE;
  const accent = resolveGuidePdfAccent(opts.brand);
  const footer = opts.footer ?? STEWARD_WORKSPACE_FOOTER.en;

  const mark =
    opts.platformMark === undefined
      ? await resolveUnionOpsMarkBytes()
      : opts.platformMark;
  const placement = guidePdfMarkPlacementPt(mark);

  let y = margin;
  if (placement && mark) {
    try {
      pdf.addImage(
        logoDataUrlFromBytes(mark),
        "PNG",
        placement.x,
        placement.y,
        placement.widthPt,
        placement.heightPt,
      );
      y = placement.y + placement.heightPt + 14;
    } catch {
      y = margin;
    }
  }

  drawAccentRule(pdf, y, margin, pageWidth, accent);
  y += 16;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin - 28) {
      pdf.addPage();
      y = margin;
    }
  };

  const writeWrapped = (
    text: string,
    optsWrite?: { bold?: boolean; size?: number; color?: PdfRgb },
  ) => {
    const size = optsWrite?.size ?? 11;
    const color = optsWrite?.color ?? ink;
    const bold = Boolean(optsWrite?.bold);
    const face = bold ? faces.headline : faces.body;
    const style =
      face === "helvetica" ? (bold ? "bold" : "normal") : bold ? "bold" : "normal";
    pdf.setFont(face, style);
    pdf.setFontSize(size);
    pdf.setTextColor(color.r, color.g, color.b);
    const lines = pdf.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      ensureSpace(size + 4);
      pdf.text(line, margin, y);
      y += size + 4;
    }
  };

  writeWrapped(opts.title, { bold: true, size: 16, color: navy });
  y += 8;

  for (const paragraph of opts.body.split(/\n/)) {
    if (!paragraph.trim()) {
      y += 6;
      continue;
    }
    const isHeading = paragraph.startsWith("#");
    const cleaned = paragraph.replace(/^#+\s*/, "").replace(/\*\*/g, "");
    writeWrapped(cleaned, {
      bold: isHeading,
      size: isHeading ? 13 : 11,
      color: isHeading ? navy : ink,
    });
  }

  y += 16;
  ensureSpace(24);
  writeWrapped(footer, { size: 8, color: muted });

  const safe = opts.filename.endsWith(".pdf")
    ? opts.filename
    : `${opts.filename}.pdf`;
  await saveBlob(pdf.output("blob"), safe);
}
