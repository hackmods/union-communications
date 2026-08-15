import { saveBlob } from "@/lib/export/save-blob";
import {
  buildHtmlToImageOptions,
  withUnscaledAncestors,
  type CaptureOptions,
} from "@/lib/export/capture";

export type ExportFormat = "png" | "svg";

export type ExportOptions = CaptureOptions;

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

export async function captureNodeToPngDataUrl(
  node: HTMLElement,
  options: ExportOptions = {},
): Promise<string> {
  return withUnscaledAncestors(node, async () => {
    const { toPng } = await import("html-to-image");
    const opts = buildHtmlToImageOptions(node, options);
    return toPng(node, opts);
  });
}

export async function exportNodeAsPng(
  node: HTMLElement,
  filename: string,
  options: ExportOptions = {},
): Promise<void> {
  await withUnscaledAncestors(node, async () => {
    const { toBlob, toPng } = await import("html-to-image");
    const opts = buildHtmlToImageOptions(node, options);
    // Prefer toBlob — avoids giant data URLs and CSP-blocked fetch(data:)
    const blob = await toBlob(node, opts);
    if (!blob || blob.size === 0) {
      const dataUrl = await toPng(node, opts);
      await saveBlob(dataUrlToBlob(dataUrl), filename);
      return;
    }
    await saveBlob(blob, filename);
  });
}

export async function exportNodeAsSvg(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  const { toSvg } = await import("html-to-image");
  const dataUrl = await toSvg(node, { cacheBust: true });
  await saveBlob(dataUrlToBlob(dataUrl), filename);
}

export async function exportNodeAsBlob(
  node: HTMLElement,
  options: ExportOptions = {},
): Promise<Blob> {
  return withUnscaledAncestors(node, async () => {
    const { toBlob, toPng } = await import("html-to-image");
    const opts = buildHtmlToImageOptions(node, {
      ...options,
      pixelRatio: options.pixelRatio ?? 1,
    });
    const blob = await toBlob(node, opts);
    if (blob && blob.size > 0) return blob;

    const dataUrl = await toPng(node, opts);
    return dataUrlToBlob(dataUrl);
  });
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  await saveBlob(blob, filename);
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
  await saveBlob(content, zipFilename);
}
