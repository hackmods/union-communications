export * from "./constants";
export * from "./types";
export * from "./worksheet-types";
export * from "./worksheet-validate";
export * from "./worksheet-measure";
export * from "./worksheet-budget";
export * from "./guide-header";
export * from "./guide-footer-band";
export * from "./vertical-flow";
export * from "./worksheet-render";
export * from "./worksheet-builder";

export { GUIDE_PDF_PALETTE as PDF_LAYOUT_PALETTE } from "./constants";

/** jsPDF inventory — intentional exceptions (canvas raster + landscape cert). */
export const PDF_ENGINE_STRAGGLERS = [
  {
    path: "src/lib/export/pdf-export.ts",
    fn: "exportFlyerPdf / nodeToPdf",
    note: "Canvas raster path — intentional; not text-PDF engine",
  },
  {
    path: "src/lib/officer-learning/certificate.ts",
    fn: "downloadOfficerLearningCertificate",
    note: "Landscape certificate — shares mark/fonts; separate layout by design",
  },
] as const;
