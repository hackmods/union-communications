import { toBlob, toPng, toSvg } from "html-to-image";
import { saveAs } from "file-saver";

export type ExportFormat = "png" | "svg";

export interface ExportOptions {
  pixelRatio?: number;
  /**
   * Canvas fill behind the node. Omit / undefined → white (most graphics tools).
   * Pass `null` for a transparent PNG (logos with rounded shapes).
   */
  backgroundColor?: string | null;
}

function pngOptions(options: ExportOptions) {
  const opts: {
    pixelRatio: number;
    cacheBust: boolean;
    backgroundColor?: string;
  } = {
    pixelRatio: options.pixelRatio ?? 2,
    cacheBust: true,
  };
  if (options.backgroundColor !== null) {
    opts.backgroundColor = options.backgroundColor ?? "#ffffff";
  }
  return opts;
}

/**
 * Convert a data URL to a Blob without `fetch()`.
 * CSP `connect-src 'self'` blocks `fetch(data:…)` (see vercel.json).
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  if (!dataUrl || dataUrl === "data:,") {
    throw new Error("Export produced an empty image");
  }
  const comma = dataUrl.indexOf(",");
  if (comma < 0) {
    throw new Error("Export produced an invalid data URL");
  }
  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const mime = header.match(/data:([^;,]+)/)?.[1] ?? "application/octet-stream";

  if (header.includes(";base64")) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }

  return new Blob([decodeURIComponent(payload)], { type: mime });
}

export async function exportNodeAsPng(
  node: HTMLElement,
  filename: string,
  options: ExportOptions = {},
): Promise<void> {
  // Prefer toBlob — avoids giant data URLs and CSP-blocked fetch(data:)
  const blob = await toBlob(node, pngOptions(options));
  if (!blob || blob.size === 0) {
    // Fallback when toBlob returns null (some older WebKit paths)
    const dataUrl = await toPng(node, pngOptions(options));
    saveAs(dataUrlToBlob(dataUrl), filename);
    return;
  }
  saveAs(blob, filename);
}

export async function exportNodeAsSvg(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await toSvg(node, { cacheBust: true });
  saveAs(dataUrlToBlob(dataUrl), filename);
}

export async function exportNodeAsBlob(
  node: HTMLElement,
  options: ExportOptions = {},
): Promise<Blob> {
  const blob = await toBlob(node, {
    ...pngOptions(options),
    pixelRatio: options.pixelRatio ?? 1,
  });
  if (blob && blob.size > 0) return blob;

  const dataUrl = await toPng(node, {
    ...pngOptions(options),
    pixelRatio: options.pixelRatio ?? 1,
  });
  return dataUrlToBlob(dataUrl);
}

export function downloadBlob(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}

export async function downloadZip(
  files: { name: string; blob: Blob }[],
  zipFilename: string,
): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file.blob);
  }
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, zipFilename);
}
