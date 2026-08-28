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
