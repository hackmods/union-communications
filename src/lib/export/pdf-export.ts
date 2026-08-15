import { saveBlob } from "@/lib/export/save-blob";
import {
  buildHtmlToImageOptions,
  pngDataUrlToJpegDataUrl,
  withUnscaledAncestors,
} from "@/lib/export/capture";

export async function exportFlyerPdf(
  imageDataUrl: string,
  filename: string,
  widthInches = 8.5,
  heightInches = 11,
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({
    orientation: heightInches > widthInches ? "portrait" : "landscape",
    unit: "in",
    format: [widthInches, heightInches],
  });

  // JPEG keeps steward downloads small and avoids blank/odd renders some
  // viewers show for multi‑MB uncompressed PNG XObjects.
  const jpegUrl = await pngDataUrlToJpegDataUrl(imageDataUrl);
  const format = jpegUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
  pdf.addImage(jpegUrl, format, 0, 0, widthInches, heightInches);
  const blob = pdf.output("blob");
  await saveBlob(blob, filename);
}

export async function nodeToPdf(
  node: HTMLElement,
  filename: string,
  widthInches = 8.5,
  heightInches = 11,
  pixelRatio = 2,
  backgroundColor?: string,
): Promise<void> {
  const dataUrl = await withUnscaledAncestors(node, async () => {
    const { toPng } = await import("html-to-image");
    return toPng(
      node,
      buildHtmlToImageOptions(node, { pixelRatio, backgroundColor }),
    );
  });
  await exportFlyerPdf(dataUrl, filename, widthInches, heightInches);
}

/** Multi-page PDF from several capture nodes (same page size). */
export async function nodesToPdf(
  nodes: HTMLElement[],
  filename: string,
  widthInches = 8.5,
  heightInches = 11,
  pixelRatio = 2,
  backgroundColor = "#ffffff",
): Promise<void> {
  if (nodes.length === 0) return;
  if (nodes.length === 1) {
    await nodeToPdf(
      nodes[0],
      filename,
      widthInches,
      heightInches,
      pixelRatio,
      backgroundColor,
    );
    return;
  }

  const [{ toPng }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({
    orientation: heightInches > widthInches ? "portrait" : "landscape",
    unit: "in",
    format: [widthInches, heightInches],
  });

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const dataUrl = await withUnscaledAncestors(node, async () =>
      toPng(
        node,
        buildHtmlToImageOptions(node, { pixelRatio, backgroundColor }),
      ),
    );
    const jpegUrl = await pngDataUrlToJpegDataUrl(dataUrl);
    const format = jpegUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
    if (i > 0) pdf.addPage([widthInches, heightInches]);
    pdf.addImage(jpegUrl, format, 0, 0, widthInches, heightInches);
  }

  await saveBlob(pdf.output("blob"), filename);
}
