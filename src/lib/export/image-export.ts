import { toPng, toSvg } from "html-to-image";
import { saveAs } from "file-saver";

export type ExportFormat = "png" | "svg";

export interface ExportOptions {
  pixelRatio?: number;
  backgroundColor?: string;
}

export async function exportNodeAsPng(
  node: HTMLElement,
  filename: string,
  options: ExportOptions = {},
): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: options.pixelRatio ?? 2,
    backgroundColor: options.backgroundColor ?? "#ffffff",
    cacheBust: true,
  });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function exportNodeAsSvg(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await toSvg(node, { cacheBust: true });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function exportNodeAsBlob(
  node: HTMLElement,
  options: ExportOptions = {},
): Promise<Blob> {
  const dataUrl = await toPng(node, {
    pixelRatio: options.pixelRatio ?? 1,
    backgroundColor: options.backgroundColor ?? "#ffffff",
    cacheBust: true,
  });
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
