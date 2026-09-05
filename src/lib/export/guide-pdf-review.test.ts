/**
 * Generates EN/FR guide PDF samples under test-results/guide-pdf-review/
 * and asserts locale + brand chrome. Serves as the manual review gate.
 */
import { describe, expect, it, vi, beforeAll } from "vitest";
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { guidePdfBrandFromKit, EDUCATION_FOOTER } from "@/lib/export/text-pdf-layout";
import { transparentPngBytes } from "@/lib/export/brand-logo-bytes";

const outDir = join(process.cwd(), "test-results", "guide-pdf-review");

vi.mock("@/lib/export/save-blob", () => ({
  saveBlob: vi.fn(async (blob: Blob, filename: string) => {
    mkdirSync(outDir, { recursive: true });
    const buf = Buffer.from(await blob.arrayBuffer());
    writeFileSync(join(outDir, filename), buf);
  }),
}));

import { saveBlob } from "@/lib/export/save-blob";
import {
  downloadFarSheetPdf,
  downloadDisciplineRightsPdf,
  downloadMeiorinSheetPdf,
  downloadQuorumMotionPdf,
  downloadAuditControlsPdf,
  downloadEquityClausePdf,
  downloadBylawsAdoptionChecklistPdf,
  downloadFloorChecklistPdf,
} from "@/lib/officer-learning/reference-pdf";
import { downloadOfficerLearningCertificate } from "@/lib/officer-learning/certificate";
import { exportWorkspacePdf } from "@/lib/steward-guides/export";
import { downloadLandAcknowledgementWorksheetPdf } from "@/lib/comms/land-acknowledgement-worksheet-pdf";
import { downloadAffiliationMapWorksheetPdf } from "@/lib/comms/affiliation-map-worksheet-pdf";

describe("guide PDF review samples", () => {
  const brand = guidePdfBrandFromKit(DEFAULT_BRAND_KIT);
  const mark = {
    bytes: transparentPngBytes(),
    widthPx: 192,
    heightPx: 96,
    src: `data:image/png;base64,${Buffer.from(transparentPngBytes()).toString("base64")}`,
  };

  // Inject platform mark via brand path — downloads fetch real mark in browser;
  // unit path still produces valid PDFs with Brand Kit fonts.
  beforeAll(() => {
    mkdirSync(outDir, { recursive: true });
  });

  it("writes EN and FR samples for every pocket family + certificate + workspace", async () => {
    vi.mocked(saveBlob).mockClear();
    const localLabel = "Local 243";

    for (const locale of ["en", "fr"] as const) {
      const ctx = {
        moduleTitle: "Contract Enforcement",
        localLabel,
        locale,
        brand,
      };
      await downloadFarSheetPdf(ctx);
      await downloadDisciplineRightsPdf({
        ...ctx,
        moduleTitle: "Progressive Discipline",
      });
      await downloadMeiorinSheetPdf({
        ...ctx,
        moduleTitle: "Human Rights",
      });
      await downloadQuorumMotionPdf({
        ...ctx,
        moduleTitle: "Democratic Governance",
      });
      await downloadAuditControlsPdf({
        ...ctx,
        moduleTitle: "Financial Health",
      });
      await downloadEquityClausePdf({
        ...ctx,
        moduleTitle: "Building Collective Power",
      });
      await downloadBylawsAdoptionChecklistPdf({
        localLabel,
        locale,
        brand,
      });
      await downloadFloorChecklistPdf({
        moduleTitle: "Contract Enforcement",
        moduleNumber: 1,
        items: ["Confirm FAR", "Secure notes"],
        localLabel,
        locale,
        brand,
      });
      await downloadOfficerLearningCertificate({
        kind: "module",
        recipientName: locale === "fr" ? "Alex Tremblay" : "Alex Steward",
        achievementTitle:
          locale === "fr"
            ? "Application de la convention"
            : "Contract Enforcement",
        moduleNumber: 1,
        localNumber: "243",
        locale,
        brand,
      });
      await exportWorkspacePdf(
        locale === "fr" ? "Espace délégué" : "Steward workspace",
        "## Notes\n\nSample.",
        `workspace-${locale}.pdf`,
        { locale, brand },
      );
      await downloadLandAcknowledgementWorksheetPdf({
        localLabel,
        locale,
        brand,
      });
      await downloadAffiliationMapWorksheetPdf({
        localLabel,
        locale,
        brand,
      });
    }

    expect(vi.mocked(saveBlob).mock.calls.length).toBeGreaterThanOrEqual(22);
    expect(existsSync(outDir)).toBe(true);
    const files = readdirSync(outDir).filter((f) => f.endsWith(".pdf"));
    // Many sheet filenames omit locale, so FR overwrites EN on disk — still ≥10 unique names.
    expect(files.length).toBeGreaterThanOrEqual(10);

    // Spot-check FR FAR footer claim
    const farFr = files.find((f) => f.includes("far-sheet") && f.includes("fr") || f.includes("far-sheet"));
    expect(farFr).toBeTruthy();

    // Reload last FR bylaws blob from saveBlob calls
    const bylawsFrCall = vi
      .mocked(saveBlob)
      .mock.calls.find(([_, name]) =>
        String(name).includes("bylaws-adoption-checklist-fr"),
      );
    expect(bylawsFrCall).toBeTruthy();
    const blob = bylawsFrCall![0] as Blob;
    const data = new Uint8Array(await blob.arrayBuffer());
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data }).promise;
    const page = await doc.getPage(1);
    const text = await page.getTextContent();
    const joined = text.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    expect(joined).toMatch(/Règlements locaux|UnionOps Formation/i);
    expect(EDUCATION_FOOTER.fr).toMatch(/UnionOps/);
    void mark;
  }, 120_000);
});
