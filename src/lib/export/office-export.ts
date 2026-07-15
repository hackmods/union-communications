/**
 * Client-side Office export (DOCX / XLSX / PPTX).
 * Heavy libs are dynamic-import()ed only on export.
 * Templates are fetched same-origin from /public — form data never leaves the device.
 */

import { downloadBlob } from "@/lib/export/image-export";
import type { BrandPalette } from "@/lib/constants/office-templates";

export type DocxData = Record<string, unknown>;

export type XlsxFillFn = (
  workbook: import("exceljs").Workbook,
) => void | Promise<void>;

const templateCache = new Map<string, ArrayBuffer>();

/**
 * Fetch a static template as ArrayBuffer, caching the original bytes.
 * Returns a copy so PizZip / ExcelJS mutations never poison the cache.
 */
export async function loadTemplateBuffer(
  templateUrl: string,
): Promise<ArrayBuffer> {
  const cached = templateCache.get(templateUrl);
  if (cached) {
    return cached.slice(0);
  }

  const res = await fetch(templateUrl);
  if (!res.ok) {
    throw new Error(`Template not found: ${templateUrl}`);
  }
  const buffer = await res.arrayBuffer();
  templateCache.set(templateUrl, buffer);
  return buffer.slice(0);
}

/** Clear cached templates (tests / hot-reload). */
export function clearOfficeTemplateCache(): void {
  templateCache.clear();
}

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

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

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
  title: string;
  subtitle?: string;
  body?: string;
  localLabel: string;
  palette: BrandPalette;
  fields: Record<string, string>;
};

function stripHash(hex: string): string {
  return hex.replace(/^#/, "");
}

/** 4 branded demo slides; theme colours embedded for PowerPoint reuse. */
export async function renderPptx(opts: PptxDemoOpts): Promise<Blob> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "LAYOUT_16x9", width: 13.333, height: 7.5 });
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "UnionOps";
  pptx.title = opts.title || "UnionOps deck";
  pptx.subject = "Branded local presentation";

  const primary = stripHash(opts.palette.primary);
  const secondary = stripHash(opts.palette.secondary);
  const accent = stripHash(opts.palette.accent);
  const title = opts.title || opts.fields.title || "Announcement";
  const subtitle =
    opts.subtitle || opts.fields.subtitle || opts.fields.headline || "";
  const body =
    opts.body || opts.fields.body || "Solidarity. Generated on your device.";
  const cta = opts.fields.cta || opts.fields.contactName || "";
  const when = [opts.fields.date, opts.fields.time].filter(Boolean).join(" · ");
  const where = opts.fields.location || "";

  // Slide 1 — title
  {
    const s = pptx.addSlide();
    s.background = { color: primary };
    s.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 6.7,
      w: 13.333,
      h: 0.8,
      fill: { color: accent },
    });
    s.addText(title, {
      x: 0.6,
      y: 2.2,
      w: 12,
      h: 1.4,
      fontSize: 40,
      bold: true,
      color: "FFFFFF",
      fontFace: "Arial",
    });
    if (subtitle) {
      s.addText(subtitle, {
        x: 0.6,
        y: 3.7,
        w: 12,
        h: 0.6,
        fontSize: 20,
        color: "FFFFFF",
        fontFace: "Arial",
      });
    }
    s.addText(opts.localLabel, {
      x: 0.6,
      y: 6.85,
      w: 12,
      h: 0.4,
      fontSize: 14,
      color: "FFFFFF",
      fontFace: "Arial",
    });
  }

  // Slide 2 — details
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
    s.addText(title, {
      x: 0.8,
      y: 0.5,
      w: 11.5,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: secondary,
      fontFace: "Arial",
    });
    const detailLines = [when, where, body].filter(Boolean);
    s.addText(detailLines.join("\n\n"), {
      x: 0.8,
      y: 1.5,
      w: 11.5,
      h: 4.5,
      fontSize: 18,
      color: "1A1A1A",
      fontFace: "Arial",
      valign: "top",
    });
  }

  // Slide 3 — key points
  {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 1.2,
      fill: { color: secondary },
    });
    s.addText("Key points", {
      x: 0.6,
      y: 0.35,
      w: 12,
      h: 0.5,
      fontSize: 26,
      bold: true,
      color: "FFFFFF",
      fontFace: "Arial",
    });
    const points = [
      opts.fields.memberName && `Member: ${opts.fields.memberName}`,
      opts.fields.stewardName && `Steward: ${opts.fields.stewardName}`,
      opts.fields.contactName && `Contact: ${opts.fields.contactName}`,
      cta,
      body,
    ].filter(Boolean) as string[];
    const bullets = (points.length ? points : [body]).slice(0, 5).map((t) => ({
      text: t,
      options: { bullet: true, breakLine: true },
    }));
    s.addText(bullets, {
      x: 0.8,
      y: 1.6,
      w: 11.5,
      h: 5,
      fontSize: 18,
      color: "1A1A1A",
      fontFace: "Arial",
    });
  }

  // Slide 4 — close
  {
    const s = pptx.addSlide();
    s.background = { color: secondary };
    s.addText(cta || "In solidarity.", {
      x: 0.6,
      y: 2.6,
      w: 12,
      h: 1,
      fontSize: 32,
      bold: true,
      color: "FFFFFF",
      fontFace: "Arial",
      align: "center",
    });
    s.addText(opts.localLabel, {
      x: 0.6,
      y: 4,
      w: 12,
      h: 0.5,
      fontSize: 16,
      color: "FFFFFF",
      fontFace: "Arial",
      align: "center",
    });
    s.addShape(pptx.ShapeType.rect, {
      x: 5.5,
      y: 5.2,
      w: 2.3,
      h: 0.12,
      fill: { color: accent },
    });
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
