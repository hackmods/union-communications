/**
 * Shared chrome for guide / Officer Learning / steward text PDFs.
 * Platform mark = UnionOps interlock PNG; education footer keeps the wordmark.
 * Dynamic-import jsPDF at call sites (TOOL-004).
 */

import { UNIONOPS_LOGOS } from "@/lib/constants/unionPresets";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";
import { saveBlob } from "@/lib/export/save-blob";

export const GUIDE_PDF_PALETTE = {
  navy: { r: 11, g: 19, b: 43 },
  teal: { r: 20, g: 184, b: 166 },
  amber: { r: 245, g: 158, b: 11 },
  ink: { r: 15, g: 23, b: 42 },
  muted: { r: 71, g: 85, b: 105 },
} as const;

export const EDUCATION_FOOTER = {
  en: "UnionOps Officer Learning — education only. Confirm every step against your collective agreement. Not legal advice.",
  fr: "UnionOps Formation des dirigeants — formation seulement. Vérifiez chaque étape avec votre convention collective. Pas un avis juridique.",
} as const;

export type GuidePdfLocale = keyof typeof EDUCATION_FOOTER;

export const STEWARD_WORKSPACE_FOOTER = {
  en: "UnionOps steward workspace — education and notes on this device. Confirm practice against your collective agreement. Not legal advice.",
  fr: "UnionOps espace délégué — notes et formation sur cet appareil. Vérifiez la pratique avec votre convention collective. Pas un avis juridique.",
} as const;

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

export function logoDataUrlFromBytes(logo: PdfImageBytes | BrandLogoBytes): string {
  if (logo.src.startsWith("data:")) return logo.src;
  return bytesToPngDataUrl(logo.bytes);
}

/**
 * Pure layout — unit-tested without jsPDF.
 * Letter portrait points; mark sits in the top-left header band.
 */
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

/**
 * Landscape certificate inches — platform mark top-left.
 * Brand Kit local logo uses `certificateLogoPlacement` (top-right when both present).
 */
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

/** Brand Kit logo on certificates — top-right when platform mark is also drawn. */
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
  // Landscape letter width 11in; right margin ~0.65
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

/** Load UnionOps interlock mark for PDF embeds. Returns null when fetch fails. */
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
  output: (type: "blob") => Blob;
};

async function createLetterPdf(): Promise<JsPdfLike> {
  const { jsPDF } = await import("jspdf");
  return new jsPDF({ unit: "pt", format: "letter" }) as unknown as JsPdfLike;
}

function drawAccentRule(
  pdf: JsPdfLike,
  y: number,
  margin: number,
  pageWidth: number,
): void {
  const { teal } = GUIDE_PDF_PALETTE;
  pdf.setDrawColor(teal.r, teal.g, teal.b);
  pdf.setLineWidth(1.5);
  pdf.line(margin, y, pageWidth - margin, y);
}

/**
 * Letter checklist / pocket sheet with UnionOps mark header + education footer.
 */
export async function writeBrandedChecklistPdf(opts: {
  title: string;
  subtitle?: string;
  sections: { heading: string; lines: string[] }[];
  filename: string;
  footer: string;
  /** Injected mark for tests; default loads platform interlock PNG. */
  platformMark?: PdfImageBytes | null;
}): Promise<void> {
  const pdf = await createLetterPdf();
  const margin = 48;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const { ink, muted, navy } = GUIDE_PDF_PALETTE;

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

  drawAccentRule(pdf, y, margin, pageWidth);
  y += 16;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin - 28) {
      pdf.addPage();
      y = margin;
    }
  };

  const write = (
    text: string,
    size: number,
    bold: boolean,
    color: typeof ink,
  ) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
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

/**
 * Steward workspace notes PDF — same platform chrome, paragraph body.
 */
export async function writeBrandedNotesPdf(opts: {
  title: string;
  body: string;
  filename: string;
  footer?: string;
  platformMark?: PdfImageBytes | null;
}): Promise<void> {
  const pdf = await createLetterPdf();
  const margin = 48;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const { ink, muted, navy } = GUIDE_PDF_PALETTE;
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

  drawAccentRule(pdf, y, margin, pageWidth);
  y += 16;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin - 28) {
      pdf.addPage();
      y = margin;
    }
  };

  const writeWrapped = (
    text: string,
    optsWrite?: { bold?: boolean; size?: number; color?: typeof ink },
  ) => {
    const size = optsWrite?.size ?? 11;
    const color = optsWrite?.color ?? ink;
    pdf.setFont("helvetica", optsWrite?.bold ? "bold" : "normal");
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
