/**
 * Invoked by `npm run pdf:preview` — writes samples to test-results/pdf-preview/.
 */
import { describe, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { downloadLandAcknowledgementWorksheetPdf } from "@/lib/comms/land-acknowledgement-worksheet-pdf";
import { downloadAffiliationMapWorksheetPdf } from "@/lib/comms/affiliation-map-worksheet-pdf";
import {
  COMMS_GUIDE_FOOTER,
  createHubInternalReportPdfBlob,
  guidePdfBrandFromKit,
  layoutWorksheet,
} from "@/lib/export/text-pdf-layout";
import { downloadFarSheetPdf } from "@/lib/officer-learning/reference-pdf";
import { downloadBoardReferencePdf } from "@/lib/comms/board-reference-pdf";
import { exportWorkspacePdf } from "@/lib/steward-guides/export";

const outDir = join(process.cwd(), "test-results", "pdf-preview");
const template = process.env.PDF_PREVIEW_TEMPLATE ?? "land-acknowledgement";
const locale = process.env.PDF_PREVIEW_LOCALE === "fr" ? "fr" : "en";

vi.mock("@/lib/export/save-blob", () => ({
  saveBlob: vi.fn(async (blob: Blob, filename: string) => {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, filename), Buffer.from(await blob.arrayBuffer()));
    console.log(`Wrote ${join(outDir, filename)}`);
  }),
}));

describe("pdf preview script", () => {
  it("pdf preview", async () => {
    if (template === "land-acknowledgement") {
      const budget = layoutWorksheet({
        title: "Land acknowledgement — floor handout",
        subtitle: "Local 243",
        layoutMode: "flow",
        sections: [{ heading: "Body", lines: [{ kind: "ruled", count: 8, rowHeight: 16 }] }],
        tips: { heading: "Floor tips", lines: ["Territory first."] },
        reminder: "Education only.",
        footer: COMMS_GUIDE_FOOTER[locale],
      });
      console.log("Layout budget:", JSON.stringify(budget, null, 2));
      await downloadLandAcknowledgementWorksheetPdf({
        localLabel: locale === "fr" ? "Section 243" : "Local 243",
        locale,
      });
      return;
    }

    if (template === "affiliation-map") {
      await downloadAffiliationMapWorksheetPdf({
        localLabel: locale === "fr" ? "Section 243" : "Local 243",
        locale,
        brand: guidePdfBrandFromKit(DEFAULT_BRAND_KIT),
      });
      return;
    }

    if (template === "far-sheet") {
      await downloadFarSheetPdf({
        moduleTitle: "Contract Enforcement",
        localLabel: locale === "fr" ? "Section 243" : "Local 243",
        locale,
        brand: guidePdfBrandFromKit(DEFAULT_BRAND_KIT),
      });
      return;
    }

    if (template === "hub-travel") {
      const blob = await createHubInternalReportPdfBlob({
        title: "Travel authorization — expense package",
        body: [
          "Event: Steward conference",
          "Purpose: Parent union assembly",
          "",
          "# Line items",
          "2026-01-01 | travel | Train fare | 120.00",
        ].join("\n"),
      });
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "unionops-travel-preview.pdf"), Buffer.from(await blob.arrayBuffer()));
      console.log(`Wrote ${join(outDir, "unionops-travel-preview.pdf")}`);
      return;
    }

    if (template === "board-checklist") {
      await downloadBoardReferencePdf({
        kind: "board-checklist",
        localLabel: locale === "fr" ? "Section 243" : "Local 243",
        locale,
        brand: guidePdfBrandFromKit(DEFAULT_BRAND_KIT),
      });
      return;
    }

    if (template === "steward-workspace") {
      await exportWorkspacePdf(
        "Complaint vs grievance diagnostic",
        "## Notes\n\nMember story here.",
        "unionops-complaint-vs-grievance-preview.pdf",
        {
          locale,
          brand: guidePdfBrandFromKit(DEFAULT_BRAND_KIT),
        },
      );
    }
  });
});
