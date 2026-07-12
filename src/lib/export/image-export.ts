import { toPng, toSvg } from "html-to-image";
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

async function downloadDataUrl(dataUrl: string, filename: string): Promise<void> {
  if (!dataUrl || dataUrl === "data:,") {
    throw new Error("Export produced an empty image");
  }
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  saveAs(blob, filename);
}

export async function exportNodeAsPng(
  node: HTMLElement,
  filename: string,
  options: ExportOptions = {},
): Promise<void> {
  const dataUrl = await toPng(node, pngOptions(options));
  await downloadDataUrl(dataUrl, filename);
}

export async function exportNodeAsSvg(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await toSvg(node, { cacheBust: true });
  await downloadDataUrl(dataUrl, filename);
}

export async function exportNodeAsBlob(
  node: HTMLElement,
  options: ExportOptions = {},
): Promise<Blob> {
  const dataUrl = await toPng(node, {
    ...pngOptions(options),
    pixelRatio: options.pixelRatio ?? 1,
  });
  if (!dataUrl || dataUrl === "data:,") {
    throw new Error("Export produced an empty image");
  }
  const res = await fetch(dataUrl);
  return res.blob();
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
