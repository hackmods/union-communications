/**
 * Client-side Office export (DOCX / XLSX).
 * Heavy libs (docxtemplater, pizzip, exceljs) are dynamic-import()ed only on export.
 * Templates are fetched same-origin from /public — form data never leaves the device.
 */

import { downloadBlob } from "@/lib/export/image-export";

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

export async function exportDocx(opts: {
  templateUrl: string;
  data: DocxData;
  filename: string;
}): Promise<void> {
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

  downloadBlob(doc.toBlob(), opts.filename);
}

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function exportXlsx(opts: {
  templateUrl: string;
  filename: string;
  fill: XlsxFillFn;
}): Promise<void> {
  const excelMod = await import("exceljs");
  // CJS/ESM interop: Workbook lives on default in bundlers, or the namespace in Node.
  const ExcelNS = (excelMod.default ?? excelMod) as typeof import("exceljs");
  const workbook = new ExcelNS.Workbook();
  const buffer = await loadTemplateBuffer(opts.templateUrl);
  // exceljs typings expect Node Buffer; Uint8Array is what JSZip accepts in browser/vitest.
  await workbook.xlsx.load(new Uint8Array(buffer) as never);
  await opts.fill(workbook);

  const out = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([new Uint8Array(out)], { type: XLSX_MIME }),
    opts.filename,
  );
}
