/**
 * Cross-family regression contracts for text PDF generators in text-pdf-layout.ts.
 * Ensures checklist / notes / worksheet writers still produce valid one-page chrome
 * after worksheet engine changes.
 */
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { transparentPngBytes } from "@/lib/export/brand-logo-bytes";
import {
  COMMS_GUIDE_FOOTER,
  EDUCATION_FOOTER,
  STEWARD_WORKSPACE_FOOTER,
  guidePdfBrandFromKit,
  writeBrandedChecklistPdf,
  writeBrandedNotesPdf,
  writeBrandedWorksheetPdf,
} from "@/lib/export/text-pdf-layout";
import {
  findTextY,
  expectMinVerticalGap,
  parseWorksheetPdfBlob,
  pdfHasEmbeddedMark,
} from "@/lib/export/worksheet-pdf-test-helpers";
import { downloadLandAcknowledgementWorksheetPdf } from "@/lib/comms/land-acknowledgement-worksheet-pdf";
import { downloadStrikeStandingBriefPdf } from "@/lib/comms/strike-standing-brief-pdf";
import { downloadBoardReferencePdf } from "@/lib/comms/board-reference-pdf";
import { downloadFarSheetPdf } from "@/lib/officer-learning/reference-pdf";
import { exportWorkspacePdf } from "@/lib/steward-guides/export";

vi.mock("@/lib/export/save-blob", () => ({
  saveBlob: vi.fn(async () => undefined),
}));

import { saveBlob } from "@/lib/export/save-blob";

const brand = guidePdfBrandFromKit(DEFAULT_BRAND_KIT);
const mark = {
  bytes: transparentPngBytes(),
  widthPx: 192,
  heightPx: 96,
  src: `data:image/png;base64,${Buffer.from(transparentPngBytes()).toString("base64")}`,
};

async function lastPdfBlob(): Promise<Blob> {
  const [blob] = vi.mocked(saveBlob).mock.calls.at(-1)!;
  return blob;
}

describe("guide PDF family contracts", () => {
  it("checklist PDF (FAR sheet) includes title, education footer, and embedded mark", async () => {
    vi.mocked(saveBlob).mockClear();
    await downloadFarSheetPdf({
      moduleTitle: "Contract Enforcement",
      localLabel: "Local 243",
      locale: "en",
      brand,
    });

    const parsed = await parseWorksheetPdfBlob(await lastPdfBlob());
    expect(parsed.numPages).toBeGreaterThanOrEqual(1);
    expect(parsed.joined).toMatch(/FAR sheet/i);
    expect(parsed.joined).toMatch(/UnionOps Officer Learning/i);
    expect(parsed.joined).toMatch(/Local 243/);
    expect((await lastPdfBlob()).size).toBeGreaterThan(500);
  });

  it("notes PDF (steward workspace) includes title and platform footer", async () => {
    vi.mocked(saveBlob).mockClear();
    await exportWorkspacePdf(
      "Complaint vs grievance diagnostic",
      "## Notes\n\nMember story here.",
      "complaint-vs-grievance.pdf",
      { locale: "en", brand },
    );

    const parsed = await parseWorksheetPdfBlob(await lastPdfBlob());
    expect(parsed.numPages).toBeGreaterThanOrEqual(1);
    expect(parsed.joined).toMatch(/Complaint vs grievance diagnostic/i);
    expect(parsed.joined).toContain(STEWARD_WORKSPACE_FOOTER.en);
  });

  it("comms board checklist PDF uses comms footer and checklist lines", async () => {
    vi.mocked(saveBlob).mockClear();
    await downloadBoardReferencePdf({
      kind: "board-checklist",
      localLabel: "Local 243",
      locale: "en",
      brand,
    });

    const parsed = await parseWorksheetPdfBlob(await lastPdfBlob());
    expect(parsed.numPages).toBeGreaterThanOrEqual(1);
    expect(parsed.joined).toMatch(/Union board print checklist/i);
    expect(parsed.joined).toContain(COMMS_GUIDE_FOOTER.en);
    expect(parsed.joined).toMatch(/Always print \(bare minimum\)/i);
  });

  it("land acknowledgement worksheet stays one page with Step 4 answer block above footer tips", async () => {
    vi.mocked(saveBlob).mockClear();
    await downloadLandAcknowledgementWorksheetPdf({
      localLabel: "Local 243",
      locale: "en",
      brand,
    });

    const parsed = await parseWorksheetPdfBlob(await lastPdfBlob());
    expect(parsed.numPages).toBe(1);
    expect(parsed.joined).toMatch(/Land acknowledgement — floor handout/i);
    expect(parsed.joined).toMatch(/Step 4 — Review and commit/i);
    expect(parsed.joined).toMatch(/One concrete local action we commit to/i);
    expect(parsed.joined).toMatch(/Changes or open questions from this review/i);

    const reviewNotesY = findTextY(parsed, "Changes or open questions from this review");
    const tipsY = findTextY(parsed, "Floor tips");
    expect(reviewNotesY).toBeDefined();
    expect(tipsY).toBeDefined();
    expect(reviewNotesY! - tipsY!).toBeGreaterThan(20);
    expect(reviewNotesY! - tipsY!).toBeLessThan(90);
    expectMinVerticalGap(parsed, "Land acknowledgement", "Research, write, commit", 10);
    expectMinVerticalGap(parsed, "Changes or open questions from this review", "Floor tips", 20);
    expect(parsed.joined).toMatch(/without notes/i);
    expect(parsed.joined).toMatch(/National \/ federation territory guide/i);
  });

  it("strike standing brief stays one page with named command above floor tips", async () => {
    vi.mocked(saveBlob).mockClear();
    await downloadStrikeStandingBriefPdf({
      localLabel: "Local 243",
      locale: "en",
      brand,
    });

    const parsed = await parseWorksheetPdfBlob(await lastPdfBlob());
    expect(parsed.numPages).toBe(1);
    expect(parsed.joined).toMatch(/Captains' standing brief/i);
    expect(parsed.joined).toMatch(/Named command/i);
    expect(parsed.joined).toMatch(/Staff Representative/i);
    expect(parsed.joined).toContain(COMMS_GUIDE_FOOTER.en);
    expectMinVerticalGap(parsed, "Captains' standing brief", "Fill before the first gate", 8);
    expectMinVerticalGap(parsed, "Before the shift", "Floor tips", 16);
  });

  it("FAR checklist: title precedes section headings", async () => {
    vi.mocked(saveBlob).mockClear();
    await downloadFarSheetPdf({
      moduleTitle: "Contract Enforcement",
      localLabel: "Local 243",
      locale: "en",
      brand,
    });

    const parsed = await parseWorksheetPdfBlob(vi.mocked(saveBlob).mock.calls.at(-1)![0]);
    expect(parsed.joined).toMatch(/FAR sheet/i);
    expectMinVerticalGap(parsed, "FAR sheet", "Facts (what happened", 10);
  });

  it("simple worksheet without fill flows footer after content (no page-bottom dead zone)", async () => {
    vi.mocked(saveBlob).mockClear();
    await writeBrandedWorksheetPdf({
      platformMark: mark,
      title: "Short notes sheet",
      subtitle: "Local 243",
      sections: [
        {
          heading: "Notes",
          lines: [
            { kind: "text", text: "Write here:" },
            { kind: "ruled", count: 2, rowHeight: 18 },
          ],
        },
      ],
      filename: "unionops-short-notes-test.pdf",
      footer: EDUCATION_FOOTER.en,
    });

    const parsed = await parseWorksheetPdfBlob(await lastPdfBlob());
    expect(parsed.numPages).toBe(1);

    const notesY = findTextY(parsed, "Notes");
    const footerY = findTextY(parsed, "UnionOps Officer Learning");
    expect(notesY).toBeDefined();
    expect(footerY).toBeDefined();
    expect(notesY! - footerY!).toBeLessThan(200);
  });

  it("checklist writer direct path still matches officer-learning margins", async () => {
    vi.mocked(saveBlob).mockClear();
    await writeBrandedChecklistPdf({
      title: "Contract smoke checklist",
      subtitle: "Local 243",
      sections: [{ heading: "Facts", lines: ["Who / when / where:"] }],
      filename: "unionops-checklist-smoke.pdf",
      footer: EDUCATION_FOOTER.en,
      platformMark: mark,
      brand,
    });

    const parsed = await parseWorksheetPdfBlob(await lastPdfBlob());
    expect(parsed.joined).toMatch(/Contract smoke checklist/i);
    expect(parsed.joined).toContain(EDUCATION_FOOTER.en);
    expect(await pdfHasEmbeddedMark(parsed.page)).toBe(true);
  });

  it("notes writer direct path still paginates long body", async () => {
    vi.mocked(saveBlob).mockClear();
    const longBody = Array.from({ length: 40 }, (_, i) => `Line ${i + 1} of notes.`).join(
      "\n",
    );
    await writeBrandedNotesPdf({
      title: "Long steward notes",
      body: longBody,
      filename: "unionops-long-notes-test.pdf",
      footer: STEWARD_WORKSPACE_FOOTER.en,
      platformMark: mark,
      brand,
    });

    const parsed = await parseWorksheetPdfBlob(await lastPdfBlob());
    expect(parsed.numPages).toBeGreaterThanOrEqual(2);
    expect(parsed.joined).toMatch(/Long steward notes/i);
  });
});
