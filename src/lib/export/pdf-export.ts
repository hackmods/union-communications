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
