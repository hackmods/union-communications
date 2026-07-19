/**
 * Client-side Office export (DOCX / XLSX / PPTX).
 * Word presets are built with the `docx` library + Brand Kit (no colour stubs).
 * Heavy libs are dynamic-import()ed only on export.
 */

import { downloadBlob } from "@/lib/export/image-export";
import type {
  BrandPalette,
  OfficePresetId,
} from "@/lib/constants/office-templates";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";
import {
  buildEventNoticeDocx,
  buildLetterheadDocx,
  buildSimpleLetterDocx,
  buildWelcomeLetterDocx,
} from "@/lib/export/office-docx-builders";
import { pickContrastingInk } from "@/lib/utils/ink";

export type DocxData = Record<string, unknown>;

export type XlsxFillFn = (
  workbook: import("exceljs").Workbook,
) => void | Promise<void>;

const templateCache = new Map<string, ArrayBuffer>();

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** Fetch/cache static templates (sample fixtures / legacy). */
export async function loadTemplateBuffer(
  templateUrl: string,
): Promise<ArrayBuffer> {
  const cached = templateCache.get(templateUrl);
  if (cached) return cached.slice(0);

  const res = await fetch(templateUrl);
  if (!res.ok) throw new Error(`Template not found: ${templateUrl}`);
  const buffer = await res.arrayBuffer();
  templateCache.set(templateUrl, buffer);
  return buffer.slice(0);
}

export function clearOfficeTemplateCache(): void {
  templateCache.clear();
}

export type DocxPresetOpts = {
  presetId: OfficePresetId;
  palette: BrandPalette;
  localLabel: string;
  fields: Record<string, string>;
  logo?: BrandLogoBytes | null;
};

/** Build a pristine Word file for a shipped preset (Brand Kit driven). */
export async function renderDocxFromPreset(
  opts: DocxPresetOpts,
): Promise<Blob> {
  const input = {
    palette: opts.palette,
    localLabel: opts.localLabel,
    fields: opts.fields,
    logo: opts.logo,
  };
  switch (opts.presetId) {
    case "simple-letter":
      return buildSimpleLetterDocx(input);
    case "welcome-letter":
      return buildWelcomeLetterDocx(input);
    case "letterhead":
      return buildLetterheadDocx(input);
    case "quick-event":
      return buildEventNoticeDocx(input);
  }
}

export async function exportDocxFromPreset(
  opts: DocxPresetOpts & { filename: string },
): Promise<void> {
  const { filename, ...rest } = opts;
  downloadBlob(await renderDocxFromPreset(rest), filename);
}

/** Legacy templated DOCX (unit tests / sample-letter only). */
export async function renderDocx(opts: {
  templateUrl: string;
  data: DocxData;
}): Promise<Blob> {
  const [pizzipMod, docxtemplaterMod] = await Promise.all([
    import("pizzip"),
    import("docxtemplater"),
  ]);
  const PizZip = pizzipMod.default;
  const Docxtemplater = docxtemplaterMod.default;
  const content = await loadTemplateBuffer(opts.templateUrl);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(opts.data);
  return doc.toBlob();
}

export async function exportDocx(opts: {
  templateUrl: string;
  data: DocxData;
  filename: string;
}): Promise<void> {
  downloadBlob(await renderDocx(opts), opts.filename);
}

const RSVP_HEADER_ROW = 11;
const RSVP_FIRST_DATA_ROW = 12;
const RSVP_ROW_COUNT = 25;
const RSVP_LAST_DATA_ROW = RSVP_FIRST_DATA_ROW + RSVP_ROW_COUNT - 1;

/** Column letters for hybrid LEC RSVP tallies (Attending=E, Mode=F, Guests=G). */
const RSVP_ATTENDING = "E";
const RSVP_MODE = "F";
const RSVP_GUESTS = "G";

/**
 * Hybrid LEC / membership RSVP sheet.
 * Tallies quorum (Yes) separately from on-site heads for the food order.
 */
export async function renderEventRsvpXlsx(opts: {
  palette: BrandPalette;
  localNumber: string;
  fields: Record<string, string>;
}): Promise<Blob> {
  const excelMod = await import("exceljs");
  const ExcelNS = (excelMod.default ?? excelMod) as typeof import("exceljs");
  const workbook = new ExcelNS.Workbook();
  const ws = workbook.addWorksheet("RSVP");
  const fill = opts.palette.primary.replace(/^#/, "").toUpperCase();
  const attendingRange = `${RSVP_ATTENDING}${RSVP_FIRST_DATA_ROW}:${RSVP_ATTENDING}${RSVP_LAST_DATA_ROW}`;
  const modeRange = `${RSVP_MODE}${RSVP_FIRST_DATA_ROW}:${RSVP_MODE}${RSVP_LAST_DATA_ROW}`;
  const guestsRange = `${RSVP_GUESTS}${RSVP_FIRST_DATA_ROW}:${RSVP_GUESTS}${RSVP_LAST_DATA_ROW}`;

  ws.getCell("A1").value = "Event";
  ws.getCell("B1").value = opts.fields.title ?? "";
  ws.getCell("A2").value = "Local";
  ws.getCell("B2").value = opts.localNumber;
  ws.getCell("A3").value = "When";
  ws.getCell("B3").value = [opts.fields.date, opts.fields.time]
    .filter(Boolean)
    .join(" · ");
  ws.getCell("A4").value = "Where";
  ws.getCell("B4").value = opts.fields.location ?? "";
  ws.getCell("A5").value = "Contact";
  ws.getCell("B5").value = opts.fields.contactName ?? "";
  ws.getCell("A6").value = "Quorum needed";
  ws.getCell("B6").value = opts.fields.quorumNeeded?.trim() || "";

  for (let r = 1; r <= 6; r++) {
    ws.getCell(`A${r}`).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getCell(`A${r}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${fill}` },
    };
  }

  // Quorum board — Yes counts toward quorum whether on site or remote
  ws.getCell("A8").value = "Quorum board";
  ws.getCell("A8").font = { bold: true };
  ws.getCell("B8").value = "Yes (quorum)";
  ws.getCell("C8").value = {
    formula: `COUNTIF(${attendingRange},"Yes")`,
  };
  ws.getCell("D8").value = "Maybe";
  ws.getCell("E8").value = {
    formula: `COUNTIF(${attendingRange},"Maybe")`,
  };
  ws.getCell("F8").value = "No";
  ws.getCell("G8").value = {
    formula: `COUNTIF(${attendingRange},"No")`,
  };
  ws.getCell("H8").value = "Still short";
  ws.getCell("I8").value = {
    formula: `IF(B6="","" ,MAX(0,VALUE(B6)-C8))`,
  };

  // Food board — on-site Yes only (+ their guests)
  ws.getCell("A9").value = "Food order (on site)";
  ws.getCell("A9").font = { bold: true };
  ws.getCell("B9").value = "On site Yes";
  ws.getCell("C9").value = {
    formula: `COUNTIFS(${attendingRange},"Yes",${modeRange},"On site")`,
  };
  ws.getCell("D9").value = "Remote Yes";
  ws.getCell("E9").value = {
    formula: `COUNTIFS(${attendingRange},"Yes",${modeRange},"Remote")`,
  };
  ws.getCell("F9").value = "Food heads";
  ws.getCell("G9").value = {
    formula:
      `COUNTIFS(${attendingRange},"Yes",${modeRange},"On site")` +
      `+SUMIFS(${guestsRange},${attendingRange},"Yes",${modeRange},"On site")`,
  };
  ws.getCell("H9").value = "Maybe on site";
  ws.getCell("I9").value = {
    formula: `COUNTIFS(${attendingRange},"Maybe",${modeRange},"On site")`,
  };

  ws.getCell("A10").value =
    "Tip: set How joining to On site or Remote when Attending is Yes/Maybe. Food heads = on-site Yes + their guests.";
  ws.getCell("A10").font = { italic: true, color: { argb: "FF4B5563" } };
  ws.mergeCells("A10:I10");

  const headers = [
    "Name",
    "Email",
    "Phone",
    "Role / office",
    "Attending",
    "How joining",
    "Guests (on site)",
    "Dietary",
    "Accessibility",
    "Notes",
  ];
  headers.forEach((h, i) => {
    const cell = ws.getCell(RSVP_HEADER_ROW, i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8EEF4" },
    };
  });

  for (let r = RSVP_FIRST_DATA_ROW; r <= RSVP_LAST_DATA_ROW; r++) {
    ws.getCell(r, 5).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Yes,No,Maybe"'],
      showErrorMessage: true,
      errorTitle: "Attending",
      error: "Choose Yes, No, or Maybe.",
    };
    ws.getCell(r, 6).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"On site,Remote"'],
      showErrorMessage: true,
      errorTitle: "How joining",
      error: "Choose On site or Remote.",
    };
    ws.getCell(r, 7).dataValidation = {
      type: "whole",
      operator: "greaterThanOrEqual",
      formulae: [0],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Guests",
      error: "Enter 0 or a whole number of on-site guests.",
    };
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 26;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 14;
  ws.getColumn(8).width = 16;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 22;

  const out = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(out)], { type: XLSX_MIME });
}

export async function exportEventRsvpXlsx(
  opts: {
    palette: BrandPalette;
    localNumber: string;
    fields: Record<string, string>;
    filename: string;
  },
): Promise<void> {
  const { filename, ...rest } = opts;
  downloadBlob(await renderEventRsvpXlsx(rest), filename);
}

/** Legacy XLSX template fill (sample-roster tests). */
export async function renderXlsx(opts: {
  templateUrl: string;
  fill: XlsxFillFn;
}): Promise<Blob> {
  const excelMod = await import("exceljs");
  const ExcelNS = (excelMod.default ?? excelMod) as typeof import("exceljs");
  const workbook = new ExcelNS.Workbook();
  const buffer = await loadTemplateBuffer(opts.templateUrl);
  await workbook.xlsx.load(new Uint8Array(buffer) as never);
  await opts.fill(workbook);
  const out = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(out)], { type: XLSX_MIME });
}

export async function exportXlsx(opts: {
  templateUrl: string;
  filename: string;
  fill: XlsxFillFn;
}): Promise<void> {
  downloadBlob(await renderXlsx(opts), opts.filename);
}

export type PptxDemoOpts = {
  presetId: OfficePresetId;
  title: string;
  subtitle?: string;
  body?: string;
  localLabel: string;
  palette: BrandPalette;
  fields: Record<string, string>;
  logo?: BrandLogoBytes | null;
};

function stripHash(hex: string): string {
  return hex.replace(/^#/, "");
}

function inkHex(bg: string): string {
  return stripHash(pickContrastingInk(bg));
}

type PptxLike = {
  ShapeType: { rect: string };
  addSlide: () => {
    background: { color: string };
    addShape: (type: string, opts: Record<string, unknown>) => void;
    addText: (text: unknown, opts: Record<string, unknown>) => void;
    addImage: (opts: Record<string, unknown>) => void;
  };
};

function addLogo(
  slide: ReturnType<PptxLike["addSlide"]>,
  logo: BrandLogoBytes | null | undefined,
  x: number,
  y: number,
  w = 1.6,
  h = 0.64,
) {
  if (!logo) return;
  slide.addImage({ data: logo.bytes, x, y, w, h });
}

function buildLetterheadOrSimple(
  pptx: PptxLike,
  opts: PptxDemoOpts,
  primary: string,
  secondary: string,
  accent: string,
  ink: string,
) {
  const title =
    opts.presetId === "letterhead"
      ? "Letterhead"
      : opts.fields.title || "Local correspondence";
  const body = opts.body || opts.fields.body || "";

  {
    const s = pptx.addSlide();
    s.background = { color: primary };
    addLogo(s, opts.logo, 0.6, 0.5);
    s.addText(opts.localLabel, {
      x: 0.6,
      y: 1.4,
      w: 12,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: ink,
      fontFace: "Arial",
    });
    s.addText(opts.fields.contactName || "", {
      x: 0.6,
      y: 2,
      w: 12,
      h: 0.4,
      fontSize: 16,
      color: ink,
      fontFace: "Arial",
    });
    s.addShape(pptx.ShapeType.rect, {
      x: 0.6,
      y: 2.7,
      w: 2.2,
      h: 0.1,
      fill: { color: accent },
    });
    s.addText(title, {
      x: 0.6,
      y: 3.2,
      w: 12,
      h: 1,
      fontSize: 28,
      bold: true,
      color: ink,
      fontFace: "Arial",
    });
  }

  {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.35,
      fill: { color: secondary },
    });
    if (opts.fields.memberName) {
      s.addText(`Dear ${opts.fields.memberName},`, {
        x: 0.8,
        y: 1,
        w: 11.5,
        h: 0.5,
        fontSize: 18,
        color: "1A1A1A",
        fontFace: "Arial",
      });
    }
    s.addText(body || "In solidarity.", {
      x: 0.8,
      y: 1.7,
      w: 11.5,
      h: 3.5,
      fontSize: 18,
      color: "1A1A1A",
      fontFace: "Arial",
      valign: "top",
    });
    s.addText(
      ["In solidarity,", opts.fields.stewardName, opts.localLabel]
        .filter(Boolean)
        .join("\n"),
      {
        x: 0.8,
        y: 5.5,
        w: 11.5,
        h: 1.2,
        fontSize: 16,
        color: secondary,
        fontFace: "Arial",
      },
    );
  }
}

function buildEvent(
  pptx: PptxLike,
  opts: PptxDemoOpts,
  primary: string,
  secondary: string,
  accent: string,
  ink: string,
) {
  const title = opts.title || opts.fields.title || "Event";
  const subtitle = opts.subtitle || opts.fields.subtitle || "";
  const when = [opts.fields.date, opts.fields.time].filter(Boolean).join(" · ");
  const where = opts.fields.location || "";
  const body = opts.body || opts.fields.body || "";

  {
    const s = pptx.addSlide();
    s.background = { color: primary };
    addLogo(s, opts.logo, 0.6, 0.4);
    s.addText(title, {
      x: 0.6,
      y: 2.2,
      w: 12,
      h: 1.2,
      fontSize: 40,
      bold: true,
      color: ink,
      fontFace: "Arial",
    });
    if (subtitle) {
      s.addText(subtitle, {
        x: 0.6,
        y: 3.5,
        w: 12,
        h: 0.5,
        fontSize: 20,
        color: ink,
        fontFace: "Arial",
      });
    }
    s.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 6.7,
      w: 13.333,
      h: 0.8,
      fill: { color: accent },
    });
    s.addText(opts.localLabel, {
      x: 0.6,
      y: 6.9,
      w: 12,
      h: 0.4,
      fontSize: 14,
      color: inkHex(`#${accent}`),
      fontFace: "Arial",
    });
  }

  {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 0.35,
      h: 7.5,
      fill: { color: primary },
    });
    s.addText("When & where", {
      x: 0.8,
      y: 0.6,
      w: 11.5,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: secondary,
      fontFace: "Arial",
    });
    s.addText([when, where].filter(Boolean).join("\n"), {
      x: 0.8,
      y: 1.4,
      w: 11.5,
      h: 1.5,
      fontSize: 22,
      bold: true,
      color: "1A1A1A",
      fontFace: "Arial",
    });
    s.addText(body, {
      x: 0.8,
      y: 3.2,
      w: 11.5,
      h: 2.5,
      fontSize: 16,
      color: "1A1A1A",
      fontFace: "Arial",
      valign: "top",
    });
  }

  {
    const s = pptx.addSlide();
    s.background = { color: secondary };
    s.addText("See you there", {
      x: 0.6,
      y: 2.8,
      w: 12,
      h: 0.8,
      fontSize: 32,
      bold: true,
      color: inkHex(`#${secondary}`),
      fontFace: "Arial",
      align: "center",
    });
    s.addText(opts.localLabel, {
      x: 0.6,
      y: 4,
      w: 12,
      h: 0.4,
      fontSize: 16,
      color: inkHex(`#${secondary}`),
      fontFace: "Arial",
      align: "center",
    });
  }
}

export async function renderPptx(opts: PptxDemoOpts): Promise<Blob> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS() as unknown as PptxLike & {
    defineLayout: (o: unknown) => void;
    layout: string;
    author: string;
    title: string;
    subject: string;
    write: (o: { outputType: string }) => Promise<unknown>;
  };
  pptx.defineLayout({ name: "LAYOUT_16x9", width: 13.333, height: 7.5 });
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "UnionOps";
  pptx.title = opts.title || "UnionOps deck";
  pptx.subject = "Branded local presentation";

  const primary = stripHash(opts.palette.primary);
  const secondary = stripHash(opts.palette.secondary);
  const accent = stripHash(opts.palette.accent);
  const ink = inkHex(opts.palette.primary);

  if (opts.presetId === "quick-event") {
    buildEvent(pptx, opts, primary, secondary, accent, ink);
  } else {
    buildLetterheadOrSimple(pptx, opts, primary, secondary, accent, ink);
  }

  const out = await pptx.write({ outputType: "blob" });
  if (out instanceof Blob) {
    return out.type ? out : new Blob([out], { type: PPTX_MIME });
  }
  return new Blob([out as BlobPart], { type: PPTX_MIME });
}

export async function exportPptx(
  opts: PptxDemoOpts & { filename: string },
): Promise<void> {
  const { filename, ...demo } = opts;
  downloadBlob(await renderPptx(demo), filename);
}

export async function exportOfficeBundle(opts: {
  zipFilename: string;
  files: { name: string; blob: Promise<Blob> | Blob }[];
}): Promise<void> {
  const resolved = await Promise.all(
    opts.files.map(async (f) => ({
      name: f.name,
      blob: await f.blob,
    })),
  );
  const { downloadZip } = await import("@/lib/export/image-export");
  await downloadZip(resolved, opts.zipFilename);
}
