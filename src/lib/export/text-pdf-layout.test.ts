import { describe, expect, it, vi } from "vitest";
import { transparentPngBytes } from "@/lib/export/brand-logo-bytes";
import {
  COMMS_GUIDE_FOOTER,
  EDUCATION_FOOTER,
  STEWARD_WORKSPACE_FOOTER,
  certificateBrandLogoPlacement,
  certificatePlatformMarkPlacement,
  guidePdfMarkPlacementPt,
  writeBrandedChecklistPdf,
  writeBrandedWorksheetPdf,
} from "./text-pdf-layout";
import {
  countWorksheetStrokeOps,
  findTextY,
  parseWorksheetPdfBlob,
} from "./worksheet-pdf-test-helpers";

vi.mock("@/lib/export/save-blob", () => ({
  saveBlob: vi.fn(async () => undefined),
}));

import { saveBlob } from "@/lib/export/save-blob";

describe("guidePdfMarkPlacementPt", () => {
  it("returns null without logo bytes", () => {
    expect(guidePdfMarkPlacementPt(null)).toBeNull();
    expect(guidePdfMarkPlacementPt(undefined)).toBeNull();
    expect(
      guidePdfMarkPlacementPt({
        bytes: new Uint8Array(),
        widthPx: 100,
        heightPx: 40,
        src: "",
      }),
    ).toBeNull();
  });

  it("places a scaled mark in the letter header band", () => {
    const bytes = transparentPngBytes();
    const placement = guidePdfMarkPlacementPt({
      bytes,
      widthPx: 192,
      heightPx: 96,
      src: "data:image/png;base64,aaa",
    });
    expect(placement).not.toBeNull();
    expect(placement!.draw).toBe(true);
    expect(placement!.x).toBe(48);
    expect(placement!.y).toBe(36);
    expect(placement!.widthPt).toBeGreaterThan(0);
    expect(placement!.heightPt).toBeLessThanOrEqual(36 + 1e-9);
  });
});

describe("certificate dual-logo placement", () => {
  it("places platform mark top-left", () => {
    const bytes = transparentPngBytes();
    const placement = certificatePlatformMarkPlacement({
      bytes,
      widthPx: 192,
      heightPx: 96,
      src: "data:image/png;base64,aaa",
    });
    expect(placement).not.toBeNull();
    expect(placement!.x).toBe(0.55);
    expect(placement!.y).toBe(0.55);
    expect(placement!.heightIn).toBeLessThanOrEqual(0.42 + 1e-9);
  });

  it("moves Brand Kit logo top-right when platform mark is present", () => {
    const bytes = transparentPngBytes();
    const alone = certificateBrandLogoPlacement(
      {
        bytes,
        extension: "png",
        widthPx: 240,
        heightPx: 96,
        src: "data:image/png;base64,aaa",
      },
      { withPlatformMark: false },
    );
    const withPlatform = certificateBrandLogoPlacement(
      {
        bytes,
        extension: "png",
        widthPx: 240,
        heightPx: 96,
        src: "data:image/png;base64,aaa",
      },
      { withPlatformMark: true },
    );
    expect(alone!.x).toBe(0.65);
    expect(withPlatform!.x).toBeGreaterThan(5);
    expect(withPlatform!.x + withPlatform!.widthIn).toBeLessThanOrEqual(
      11 - 0.65 + 1e-9,
    );
  });
});

describe("education footers", () => {
  it("names UnionOps in EN and FR", () => {
    expect(EDUCATION_FOOTER.en).toMatch(/UnionOps/);
    expect(EDUCATION_FOOTER.fr).toMatch(/UnionOps/);
    expect(EDUCATION_FOOTER.en).toMatch(/not legal advice/i);
    expect(EDUCATION_FOOTER.fr).toMatch(/Pas un avis juridique/);
    expect(STEWARD_WORKSPACE_FOOTER.en).toMatch(/UnionOps/);
  });
});

describe("writeBrandedChecklistPdf", () => {
  it("emits a PDF blob with title, footer, and embedded mark image", async () => {
    const bytes = transparentPngBytes();
    const mark = {
      bytes,
      widthPx: 192,
      heightPx: 96,
      src: `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`,
    };

    await writeBrandedChecklistPdf({
      title: "FAR sheet — Facts / Argument / Resolution",
      subtitle: "Contract Enforcement · Local 243",
      sections: [{ heading: "Facts", lines: ["Who / when / where:"] }],
      filename: "unionops-far-sheet-test.pdf",
      footer: EDUCATION_FOOTER.en,
      platformMark: mark,
      brand: {
        headlineFontId: "montserrat",
        bodyFontId: "sourceSans",
        primaryColor: "#C2410C",
      },
    });

    expect(saveBlob).toHaveBeenCalledOnce();
    const [blob, filename] = vi.mocked(saveBlob).mock.calls[0]!;
    expect(filename).toBe("unionops-far-sheet-test.pdf");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(500);

    const data = new Uint8Array(await blob.arrayBuffer());
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data }).promise;
    expect(doc.numPages).toBeGreaterThanOrEqual(1);
    const page = await doc.getPage(1);
    const text = await page.getTextContent();
    const joined = text.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    expect(joined).toMatch(/FAR sheet/i);
    expect(joined).toMatch(/UnionOps Officer Learning/i);

    const ops = await page.getOperatorList();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OPS = (pdfjs as any).OPS ?? {};
    const paintImage = ops.fnArray.some((fn: number) => {
      const name = Object.entries(OPS).find(([, v]) => v === fn)?.[0] ?? "";
      return /paintImage/i.test(name);
    });
    expect(paintImage).toBe(true);
  });
});

describe("writeBrandedWorksheetPdf", () => {
  type WorksheetPdfOpts = Omit<
    Parameters<typeof writeBrandedWorksheetPdf>[0],
    "platformMark"
  >;

  const markBytes = transparentPngBytes();
  const mark = {
    bytes: markBytes,
    widthPx: 192,
    heightPx: 96,
    src: `data:image/png;base64,${Buffer.from(markBytes).toString("base64")}`,
  };

  async function worksheetText(opts: WorksheetPdfOpts) {
    vi.mocked(saveBlob).mockClear();
    await writeBrandedWorksheetPdf({ platformMark: mark, ...opts });
    const [blob] = vi.mocked(saveBlob).mock.calls.at(-1)!;
    const parsed = await parseWorksheetPdfBlob(blob);
    const strokeOps = await countWorksheetStrokeOps(parsed.page);
    return { ...parsed, blob, strokeOps };
  }

  it("emits a compact worksheet with ruled rows and field labels", async () => {
    const { joined } = await worksheetText({
      title: "Land acknowledgement — floor handout",
      subtitle: "Solo draft · Local 243",
      instructions: "Fill in pen. Confirm spellings before the next meeting.",
      sections: [
        {
          heading: "Draft",
          intro: "Territory first, then action.",
          lines: [
            { kind: "text", text: "Territory and action:" },
            { kind: "ruled", count: 2 },
            { kind: "field", label: "Executive review date" },
            { kind: "check", text: "Speaker can explain every phrase" },
          ],
        },
      ],
      tips: {
        heading: "Floor tips",
        lines: ["Territory first — where you meet."],
      },
      reminder: "Education only — not a script to paste.",
      filename: "unionops-land-acknowledgement-worksheet-test.pdf",
      footer: COMMS_GUIDE_FOOTER.en,
      margin: 32,
    });

    expect(joined).toMatch(/Land acknowledgement — floor handout/i);
    expect(joined).toMatch(/Floor tips/i);
    expect(joined).toMatch(/Executive review date/i);
    expect(joined).toMatch(/UnionOps Comms/i);
  });

  it("renders fieldPair, checkPair, and closingSections on one page", async () => {
    const { joined, numPages, yByExact: yBySnippet } = await worksheetText({
      title: "Worksheet engine sample",
      subtitle: "Local 243",
      sections: [
        {
          heading: "Metadata",
          lines: [
            {
              kind: "fieldPair",
              left: { label: "Local / committee" },
              right: { label: "Date" },
            },
            { kind: "text", text: "Draft prompt:" },
            { kind: "ruled", fill: true, minRows: 4, rowHeight: 20 },
          ],
        },
      ],
      closingSections: [
        {
          heading: "Review and commit",
          lines: [
            {
              kind: "checkPair",
              left: "Accurate for this territory",
              right: "Speaker can explain every phrase",
            },
            {
              kind: "fieldPair",
              left: { label: "Who reads?" },
              right: { label: "Review date" },
            },
          ],
        },
      ],
      tips: { heading: "Floor tips", lines: ["Territory first."] },
      reminder: "Education only.",
      filename: "unionops-worksheet-engine-sample.pdf",
      footer: COMMS_GUIDE_FOOTER.en,
    });

    expect(numPages).toBe(1);
    expect(joined).toMatch(/Local \/ committee/i);
    expect(joined).toMatch(/Review and commit/i);
    expect(joined).toMatch(/Accurate for this territory/i);
    expect(joined).toMatch(/Floor tips/i);

    const draftY = yBySnippet.get("Draft prompt:");
    const reviewY = yBySnippet.get("Review and commit");
    expect(draftY).toBeDefined();
    expect(reviewY).toBeDefined();
    // PDF text transform y is from page bottom — closing band sits below the fill block.
    expect(reviewY!).toBeLessThan(draftY!);
  });

  it("draws more ruled lines when fill is enabled vs a fixed count", async () => {
    const base = {
      title: "Fill test",
      subtitle: "Local 243",
      sections: [
        {
          heading: "Body",
          lines: [{ kind: "text", text: "Notes:" }],
        },
      ],
      filename: "unionops-worksheet-fill-test.pdf",
      footer: COMMS_GUIDE_FOOTER.en,
    } as const;

    const fixed = await worksheetText({
      ...base,
      sections: [
        {
          heading: "Body",
          lines: [
            { kind: "text", text: "Notes:" },
            { kind: "ruled", count: 2, rowHeight: 20 },
          ],
        },
      ],
    });
    const filled = await worksheetText({
      ...base,
      sections: [
        {
          heading: "Body",
          lines: [
            { kind: "text", text: "Notes:" },
            { kind: "ruled", fill: true, minRows: 6, maxRows: 8, rowHeight: 20 },
          ],
        },
      ],
    });

    const fixedLines = fixed.strokeOps;
    const filledLines = filled.strokeOps;
    expect(filledLines).toBeGreaterThan(fixedLines);
    expect(filled.numPages).toBe(1);
  });

  it("pins footer band below flowing sections when closingSections is omitted", async () => {
    const parsed = await worksheetText({
      title: "Flowing worksheet",
      subtitle: "Local 243",
      sections: [
        {
          heading: "Notes",
          lines: [
            { kind: "text", text: "Write here:" },
            { kind: "ruled", count: 3, rowHeight: 18 },
          ],
        },
      ],
      tips: { heading: "Floor tips", lines: ["Keep it short."] },
      reminder: "Education only.",
      filename: "unionops-flowing-worksheet-test.pdf",
      footer: COMMS_GUIDE_FOOTER.en,
    });

    expect(parsed.numPages).toBe(1);

    const notesY = findTextY(parsed, "Notes");
    const tipsY = findTextY(parsed, "Floor tips");
    const footerY = findTextY(parsed, "UnionOps Comms");
    expect(notesY).toBeDefined();
    expect(tipsY).toBeDefined();
    expect(footerY).toBeDefined();
    expect(notesY!).toBeGreaterThan(tipsY!);
    expect(tipsY!).toBeGreaterThan(footerY!);
  });

  it("flows footer after short body when no fill or closingSections", async () => {
    const parsed = await worksheetText({
      title: "Short sheet",
      subtitle: "Local 243",
      sections: [
        {
          heading: "Notes",
          lines: [{ kind: "ruled", count: 2, rowHeight: 18 }],
        },
      ],
      filename: "unionops-short-flow-footer.pdf",
      footer: EDUCATION_FOOTER.en,
    });

    const notesY = findTextY(parsed, "Notes");
    const footerY = findTextY(parsed, "UnionOps Officer Learning");
    expect(notesY).toBeDefined();
    expect(footerY).toBeDefined();
    expect(notesY! - footerY!).toBeLessThan(180);
  });

  it("renders more ruled strokes when fixed row count increases", async () => {
    const threeRows = await worksheetText({
      title: "Row count",
      subtitle: "Local 243",
      sections: [
        {
          heading: "Draft",
          lines: [{ kind: "ruled", count: 3, rowHeight: 20 }],
        },
      ],
      filename: "unionops-row-count-3.pdf",
      footer: COMMS_GUIDE_FOOTER.en,
    });
    const fiveRows = await worksheetText({
      title: "Row count",
      subtitle: "Local 243",
      sections: [
        {
          heading: "Draft",
          lines: [{ kind: "ruled", count: 5, rowHeight: 20 }],
        },
      ],
      filename: "unionops-row-count-5.pdf",
      footer: COMMS_GUIDE_FOOTER.en,
    });

    expect(fiveRows.strokeOps).toBeGreaterThan(threeRows.strokeOps);
  });

  it("caps fill rows when maxRows is set", async () => {
    const capped = await worksheetText({
      title: "Fill cap test",
      subtitle: "Local 243",
      sections: [
        {
          heading: "Body",
          lines: [
            { kind: "text", text: "Notes:" },
            { kind: "ruled", fill: true, minRows: 4, maxRows: 6, rowHeight: 20 },
          ],
        },
      ],
      filename: "unionops-worksheet-fill-cap-test.pdf",
      footer: COMMS_GUIDE_FOOTER.en,
    });
    const uncapped = await worksheetText({
      title: "Fill cap test",
      subtitle: "Local 243",
      sections: [
        {
          heading: "Body",
          lines: [
            { kind: "text", text: "Notes:" },
            { kind: "ruled", fill: true, minRows: 4, rowHeight: 20 },
          ],
        },
      ],
      filename: "unionops-worksheet-fill-open-test.pdf",
      footer: COMMS_GUIDE_FOOTER.en,
    });

    const cappedLines = capped.strokeOps;
    const uncappedLines = uncapped.strokeOps;
    expect(cappedLines).toBeLessThan(uncappedLines);
  });
});

describe("writeBrandedNotesPdf", () => {
  it("emits a steward workspace PDF with platform footer and mark", async () => {
    const { writeBrandedNotesPdf } = await import("./text-pdf-layout");
    vi.mocked(saveBlob).mockClear();

    const bytes = transparentPngBytes();
    const mark = {
      bytes,
      widthPx: 192,
      heightPx: 96,
      src: `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`,
    };

    await writeBrandedNotesPdf({
      title: "Complaint vs grievance diagnostic",
      body: "## Notes\n\nMember story here.",
      filename: "complaint-vs-grievance.pdf",
      footer: STEWARD_WORKSPACE_FOOTER.en,
      platformMark: mark,
    });

    expect(saveBlob).toHaveBeenCalledOnce();
    const [blob] = vi.mocked(saveBlob).mock.calls[0]!;
    const data = new Uint8Array(await blob.arrayBuffer());
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data }).promise;
    const page = await doc.getPage(1);
    const text = await page.getTextContent();
    const joined = text.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    expect(joined).toMatch(/Complaint vs grievance/i);
    expect(joined).toMatch(/UnionOps steward workspace/i);
  });
});
