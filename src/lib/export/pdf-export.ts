import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";

export async function exportFlyerPdf(
  imageDataUrl: string,
  filename: string,
  widthInches = 8.5,
  heightInches = 11,
): Promise<void> {
  const pdf = new jsPDF({
    orientation: heightInches > widthInches ? "portrait" : "landscape",
    unit: "in",
    format: [widthInches, heightInches],
  });

  pdf.addImage(imageDataUrl, "PNG", 0, 0, widthInches, heightInches);
  const blob = pdf.output("blob");
  saveAs(blob, filename);
}

export async function nodeToPdf(
  node: HTMLElement,
  filename: string,
  widthInches = 8.5,
  heightInches = 11,
  pixelRatio = 2,
  backgroundColor?: string,
): Promise<void> {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(node, {
    pixelRatio,
    cacheBust: true,
    width: Math.max(1, Math.round(node.offsetWidth)),
    height: Math.max(1, Math.round(node.offsetHeight)),
    backgroundColor:
      backgroundColor ??
      (() => {
        const computed = getComputedStyle(node).backgroundColor;
        return !computed || computed === "rgba(0, 0, 0, 0)" || computed === "transparent"
          ? "#ffffff"
          : computed;
      })(),
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

  const { toPng } = await import("html-to-image");
  const { jsPDF } = await import("jspdf");
  const { saveAs } = await import("file-saver");

  const pdf = new jsPDF({
    orientation: heightInches > widthInches ? "portrait" : "landscape",
    unit: "in",
    format: [widthInches, heightInches],
  });

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const dataUrl = await toPng(node, {
      pixelRatio,
      cacheBust: true,
      width: Math.max(1, Math.round(node.offsetWidth)),
      height: Math.max(1, Math.round(node.offsetHeight)),
      backgroundColor,
    });
    if (i > 0) pdf.addPage([widthInches, heightInches]);
    pdf.addImage(dataUrl, "PNG", 0, 0, widthInches, heightInches);
  }

  saveAs(pdf.output("blob"), filename);
}
