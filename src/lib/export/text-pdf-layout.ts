/**
 * Shared chrome for guide / Officer Learning / steward text PDFs.
 * Platform mark = UnionOps interlock PNG; Brand Kit faces/palette when provided.
 * Dynamic-import jsPDF at call sites (TOOL-004).
 *
 * Layout engine primitives live in `./pdf-layout/` — header/footer bands,
 * worksheet modes, budget API, and builder DSL.
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
import {
  BODY_FACE,
  CHECKLIST_HEADER_RULE_GAP,
  CHECKLIST_HEADER_TITLE_SIZE,
  GUIDE_PDF_MARGIN_DEFAULT,
  GUIDE_PDF_PALETTE,
  HEADLINE_FACE,
  WORKSHEET_MARGIN_DEFAULT,
  type PdfRgb,
} from "@/lib/export/pdf-layout/constants";
import { renderGuideHeader, setPdfFont } from "@/lib/export/pdf-layout/guide-header";
import { renderWorksheetDocument } from "@/lib/export/pdf-layout/worksheet-render";
import {
  resolveWorksheetLayoutMode,
  validateWorksheetLayout,
} from "@/lib/export/pdf-layout/worksheet-validate";
import type { WorksheetLayoutMode } from "@/lib/export/pdf-layout/types";
import type {
  WorksheetSection,
} from "@/lib/export/pdf-layout/worksheet-types";
import { saveBlob } from "@/lib/export/save-blob";
import type { BrandKit } from "@/types/entities";
import { hexToRgb } from "@/lib/utils/contrast";
import type { JsPdfLike, GuidePdfFontFaces } from "@/lib/export/pdf-layout/types";

export { GUIDE_PDF_PALETTE, WORKSHEET_MARGIN_DEFAULT, WORKSHEET_RULE_ROW_DEFAULT } from "@/lib/export/pdf-layout/constants";
export type { PdfRgb, WorksheetLayoutMode } from "@/lib/export/pdf-layout";
export type { WorksheetLine, WorksheetSection } from "@/lib/export/pdf-layout/worksheet-types";
export {
  layoutWorksheet,
  buildWorksheet,
  wsLine,
  PDF_ENGINE_STRAGGLERS,
} from "@/lib/export/pdf-layout";

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

/** Hub internal exports (travel, expenses, time rollup) — not steward education sheets. */
export const HUB_INTERNAL_REPORT_FOOTER = {
  en: "UnionOps Officer Hub — internal report on this device. Confirm totals before submitting to your parent union. Not connected to SAP/ERP.",
  fr: "UnionOps Hub des dirigeants — rapport interne sur cet appareil. Vérifiez les totaux avant de transmettre à votre syndicat parent. Non connecté à SAP/ERP.",
} as const;

export type GuidePdfBrand = {
  primaryColor?: string;
  headlineFontId?: CanvasFontId;
  bodyFontId?: CanvasFontId;
};

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

export type { GuidePdfFontFaces };

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
  const margin = GUIDE_PDF_MARGIN_DEFAULT;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const { ink, muted, navy } = GUIDE_PDF_PALETTE;
  const accent = resolveGuidePdfAccent(opts.brand);
  const fontCtx = { pdf, faces };

  const mark =
    opts.platformMark === undefined
      ? await resolveUnionOpsMarkBytes()
      : opts.platformMark;
  const placement = guidePdfMarkPlacementPt(mark);

  let startY = margin;
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
      startY = placement.y + placement.heightPt + 14;
    } catch {
      startY = margin;
    }
  }

  let y = renderGuideHeader({
    ctx: fontCtx,
    margin,
    pageWidth,
    accent,
    title: opts.title,
    subtitle: opts.subtitle,
    titleSize: CHECKLIST_HEADER_TITLE_SIZE,
    ruleGapAfterTitle: 0,
    ruleGapAfterRule: CHECKLIST_HEADER_RULE_GAP - 4,
    startY,
  });

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin - 28) {
      pdf.addPage();
      y = margin;
    }
  };

  const write = (text: string, size: number, bold: boolean, color: PdfRgb) => {
    setPdfFont(fontCtx, size, bold, color);
    const lines = pdf.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      ensureSpace(size + 5);
      pdf.text(line, margin, y);
      y += size + 5;
    }
  };

  y += 4;

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

export type WriteBrandedWorksheetPdfOptions = {
  title: string;
  subtitle?: string;
  instructions?: string;
  sections: WorksheetSection[];
  closingSections?: WorksheetSection[];
  tips?: { heading: string; lines: readonly string[] };
  reminder?: string;
  filename: string;
  footer: string;
  platformMark?: PdfImageBytes | null;
  brand?: GuidePdfBrand | null;
  margin?: number;
  /** Explicit layout mode — inferred from sections when omitted. */
  layoutMode?: WorksheetLayoutMode;
  /** Allow pageBreak lines and multi-page output. */
  allowMultiPage?: boolean;
};

/**
 * Branded fill-in worksheet (pen-and-paper floor handouts).
 * Layout modes: `flow` | `pinnedFooter` | `pinnedClosing` — see `pdf-layout/`.
 */
export async function writeBrandedWorksheetPdf(
  opts: WriteBrandedWorksheetPdfOptions,
): Promise<void> {
  const validation = validateWorksheetLayout(opts);
  if (!validation.ok) {
    throw new Error(`Invalid worksheet layout: ${validation.errors.join(" ")}`);
  }

  const pdf = await createLetterPdf();
  const faces = await registerGuidePdfFonts(pdf, opts.brand);
  const margin = opts.margin ?? WORKSHEET_MARGIN_DEFAULT;
  const accent = resolveGuidePdfAccent(opts.brand);
  const layoutMode = resolveWorksheetLayoutMode(opts);

  const mark =
    opts.platformMark === undefined
      ? await resolveUnionOpsMarkBytes()
      : opts.platformMark;
  const placement = guidePdfWorksheetMarkPlacementPt(mark, margin);

  let markStartY = margin;
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
      markStartY = placement.y + placement.heightPt + 5;
    } catch {
      markStartY = 24;
    }
  }

  renderWorksheetDocument({
    pdf,
    fontCtx: { pdf, faces },
    margin,
    accent,
    title: opts.title,
    subtitle: opts.subtitle,
    instructions: opts.instructions,
    sections: opts.sections,
    closingSections: opts.closingSections,
    footer: opts.footer,
    reminder: opts.reminder,
    tips: opts.tips,
    layoutMode,
    allowMultiPage: opts.allowMultiPage,
    markStartY,
  });

  await saveBlob(pdf.output("blob"), opts.filename);
}

export async function createBrandedNotesPdfBlob(opts: {
  title: string;
  body: string;
  footer?: string;
  platformMark?: PdfImageBytes | null;
  brand?: GuidePdfBrand | null;
}): Promise<Blob> {
  const pdf = await createLetterPdf();
  const faces = await registerGuidePdfFonts(pdf, opts.brand);
  const margin = GUIDE_PDF_MARGIN_DEFAULT;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const { ink, muted, navy } = GUIDE_PDF_PALETTE;
  const accent = resolveGuidePdfAccent(opts.brand);
  const footer = opts.footer ?? STEWARD_WORKSPACE_FOOTER.en;
  const fontCtx = { pdf, faces };

  const mark =
    opts.platformMark === undefined
      ? await resolveUnionOpsMarkBytes()
      : opts.platformMark;
  const placement = guidePdfMarkPlacementPt(mark);

  let startY = margin;
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
      startY = placement.y + placement.heightPt + 14;
    } catch {
      startY = margin;
    }
  }

  let y = renderGuideHeader({
    ctx: fontCtx,
    margin,
    pageWidth,
    accent,
    title: opts.title,
    titleSize: CHECKLIST_HEADER_TITLE_SIZE,
    ruleGapAfterTitle: 0,
    ruleGapAfterRule: CHECKLIST_HEADER_RULE_GAP - 4,
    startY,
  });
  y += 8;

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
    setPdfFont(fontCtx, size, bold, color);
    const lines = pdf.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      ensureSpace(size + 4);
      pdf.text(line, margin, y);
      y += size + 4;
    }
  };

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

  return pdf.output("blob");
}

/** Hub travel / expense / time rollup PDFs — shared mark + header + internal footer. */
export async function createHubInternalReportPdfBlob(opts: {
  title: string;
  body: string;
  locale?: GuidePdfLocale;
  platformMark?: PdfImageBytes | null;
  brand?: GuidePdfBrand | null;
}): Promise<Blob> {
  const locale = opts.locale === "fr" ? "fr" : "en";
  return createBrandedNotesPdfBlob({
    title: opts.title,
    body: opts.body,
    footer: HUB_INTERNAL_REPORT_FOOTER[locale],
    platformMark: opts.platformMark,
    brand: opts.brand,
  });
}

export async function writeBrandedNotesPdf(opts: {
  title: string;
  body: string;
  filename: string;
  footer?: string;
  platformMark?: PdfImageBytes | null;
  brand?: GuidePdfBrand | null;
}): Promise<void> {
  const blob = await createBrandedNotesPdfBlob(opts);
  const safe = opts.filename.endsWith(".pdf")
    ? opts.filename
    : `${opts.filename}.pdf`;
  await saveBlob(blob, safe);
}
