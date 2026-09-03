import { describe, expect, it, vi } from "vitest";
import { COMMS_GUIDE_FOOTER, layoutWorksheet, writeBrandedWorksheetPdf } from "@/lib/export/text-pdf-layout";
import { transparentPngBytes } from "@/lib/export/brand-logo-bytes";
import {
  countWorksheetStrokeOps,
  expectHeadingOrder,
  expectMinFieldBlockGap,
  expectPairUsesRowColumns,
  findTextY,
  parseWorksheetPdfBlob,
} from "@/lib/export/worksheet-pdf-test-helpers";
import {
  downloadLandAcknowledgementWorksheetPdf,
  LAND_ACK_DRAFT_ROWS,
} from "./land-acknowledgement-worksheet-pdf";

const REFLECT_RULED_ROW_COUNT = 2;

vi.mock("@/lib/export/save-blob", () => ({
  saveBlob: vi.fn(async () => undefined),
}));

import { saveBlob } from "@/lib/export/save-blob";

async function exportWorksheet(
  opts: Parameters<typeof downloadLandAcknowledgementWorksheetPdf>[0],
) {
  vi.mocked(saveBlob).mockClear();
  await downloadLandAcknowledgementWorksheetPdf(opts);
  const [blob, filename] = vi.mocked(saveBlob).mock.calls.at(-1)!;
  const parsed = await parseWorksheetPdfBlob(blob);
  const strokeOps = await countWorksheetStrokeOps(parsed.page);
  return { blob, filename, parsed, strokeOps };
}

describe("land-acknowledgement-worksheet-pdf", () => {
  it("exports EN floor handout on one page with full step flow", async () => {
    const { filename, parsed } = await exportWorksheet({
      localLabel: "Local 243",
      locale: "en",
      brand: {
        headlineFontId: "montserrat",
        bodyFontId: "sourceSans",
        primaryColor: "#C2410C",
      },
    });

    expect(filename).toBe("unionops-land-acknowledgement-worksheet.pdf");
    expect(parsed.numPages).toBe(1);
    expect(parsed.joined).toMatch(/Land acknowledgement — floor handout/i);
    expect(parsed.joined).toMatch(/Local 243/);
    expect(parsed.joined).toMatch(/UnionOps Comms/i);
    expect(parsed.joined).toMatch(/Floor tips/i);
    expect(parsed.joined).toMatch(/Education only/i);

    expectHeadingOrder(parsed, [
      "Before you start",
      "Step 1 — Research",
      "Step 2 — Reflect",
      "Step 3 — Draft",
      "Step 4 — Review and commit",
      "Floor tips",
    ]);

    expect(parsed.joined).toMatch(/Local \/ committee/i);
    expect(parsed.joined).toMatch(/Nations for where we meet/i);
    expect(parsed.joined).toMatch(/Accurate for this territory/i);
    expect(parsed.joined).toMatch(/Executive review date/i);
    expect(parsed.joined).toMatch(/without notes/i);
    expect(parsed.joined).toMatch(/Federation guide \(OFL \/ national \/ CUPE \/ other\)/i);
    expect(parsed.joined).toMatch(/consulted if unsure/i);

    const step3Y = findTextY(parsed, "Step 3 — Draft");
    const step4Y = findTextY(parsed, "Step 4 — Review and commit");
    const tipsY = findTextY(parsed, "Floor tips");
    expect(step3Y).toBeDefined();
    expect(step4Y).toBeDefined();
    expect(tipsY).toBeDefined();
    expect(step3Y!).toBeGreaterThan(step4Y!);
    expect(step4Y!).toBeGreaterThan(tipsY!);
  });

  it("exports FR floor handout on one page with matching structure", async () => {
    const { filename, parsed } = await exportWorksheet({
      localLabel: "Section 243",
      locale: "fr",
    });

    expect(filename).toBe("unionops-reconnaissance-territoriale-feuille.pdf");
    expect(parsed.numPages).toBe(1);
    expect(parsed.joined).toMatch(/Reconnaissance territoriale — feuille de terrain/i);
    expect(parsed.joined).toMatch(/Section 243/);
    expect(parsed.joined).toMatch(/UnionOps Communications/i);
    expect(parsed.joined).toMatch(/Conseils sur le plancher/i);
    expect(parsed.joined).toMatch(/Formation seulement/i);

    expectHeadingOrder(parsed, [
      "Avant de commencer",
      "Étape 1 — Recherche",
      "Étape 2 — Réflexion",
      "Étape 3 — Rédaction",
      "Étape 4 — Réviser et s'engager",
      "Conseils sur le plancher",
    ]);
  });

  it("uses capped fill for Step 3 — fewer ruled strokes than uncapped fill on same skeleton", async () => {
    const markBytes = transparentPngBytes();
    const mark = {
      bytes: markBytes,
      widthPx: 192,
      heightPx: 96,
      src: `data:image/png;base64,${Buffer.from(markBytes).toString("base64")}`,
    };

    const draftMinRows = 6;
    const draftMaxRows = 10;

    const skeletonSections = [
      {
        heading: "Step 2 — Reflect",
        lines: [
          { kind: "text" as const, text: "Why acknowledgement matters:" },
          { kind: "ruled" as const, count: REFLECT_RULED_ROW_COUNT, rowHeight: 17 },
        ],
      },
      {
        heading: "Step 3 — Draft",
        lines: [
          { kind: "text" as const, text: "Draft in your own words:" },
          {
            kind: "ruled" as const,
            fill: true,
            minRows: draftMinRows,
            rowHeight: 17,
          },
        ],
      },
    ];
    const closing = [
      {
        heading: "Step 4 — Review and commit",
        lines: [
          {
            kind: "checkPair" as const,
            left: "Accurate for this territory",
            right: "Speaker can explain every phrase",
          },
        ],
      },
    ];

    vi.mocked(saveBlob).mockClear();
    await writeBrandedWorksheetPdf({
      platformMark: mark,
      title: "Cap compare",
      subtitle: "Local 243",
      sections: skeletonSections,
      closingSections: closing,
      tips: { heading: "Floor tips", lines: ["Territory first."] },
      reminder: "Education only.",
      filename: "cap-compare-uncapped.pdf",
      footer: COMMS_GUIDE_FOOTER.en,
    });
    const uncappedBlob = vi.mocked(saveBlob).mock.calls.at(-1)![0];
    const uncappedStrokes = await countWorksheetStrokeOps(
      (await parseWorksheetPdfBlob(uncappedBlob)).page,
    );

    vi.mocked(saveBlob).mockClear();
    await writeBrandedWorksheetPdf({
      platformMark: mark,
      title: "Cap compare",
      subtitle: "Local 243",
      sections: [
        skeletonSections[0]!,
        {
          heading: "Step 3 — Draft",
          lines: [
            { kind: "text", text: "Draft in your own words:" },
            {
              kind: "ruled",
              fill: true,
              minRows: draftMinRows,
              maxRows: draftMaxRows,
              rowHeight: 17,
            },
          ],
        },
      ],
      closingSections: closing,
      tips: { heading: "Floor tips", lines: ["Territory first."] },
      reminder: "Education only.",
      filename: "cap-compare-capped.pdf",
      footer: COMMS_GUIDE_FOOTER.en,
    });
    const cappedBlob = vi.mocked(saveBlob).mock.calls.at(-1)![0];
    const cappedStrokes = await countWorksheetStrokeOps(
      (await parseWorksheetPdfBlob(cappedBlob)).page,
    );

    expect(cappedStrokes).toBeLessThan(uncappedStrokes);
    expect(cappedStrokes).toBeGreaterThanOrEqual(
      REFLECT_RULED_ROW_COUNT + draftMinRows,
    );
  });

  it("uses fixed draft rows instead of fill on the floor handout", async () => {
    const fixed = await exportWorksheet({
      localLabel: "Local 243",
      locale: "en",
    });

    vi.mocked(saveBlob).mockClear();
    await writeBrandedWorksheetPdf({
      platformMark: {
        bytes: transparentPngBytes(),
        widthPx: 192,
        heightPx: 96,
        src: "data:image/png;base64,AA==",
      },
      title: "Land acknowledgement — floor handout",
      subtitle: "Local 243",
      sections: [
        {
          heading: "Step 3 — Draft",
          lines: [
            { kind: "text", text: "Draft in your own words:" },
            { kind: "ruled", fill: true, minRows: 6, rowHeight: 16 },
          ],
        },
      ],
      tips: { heading: "Floor tips", lines: ["Territory first."] },
      reminder: "Education only.",
      filename: "fill-dominated-test.pdf",
      footer: COMMS_GUIDE_FOOTER.en,
    });
    const fillDominated = await countWorksheetStrokeOps(
      (await parseWorksheetPdfBlob(vi.mocked(saveBlob).mock.calls.at(-1)![0])).page,
    );

    expect(fixed.strokeOps).toBeLessThan(fillDominated);
    expect(fixed.strokeOps).toBeGreaterThanOrEqual(
      REFLECT_RULED_ROW_COUNT + LAND_ACK_DRAFT_ROWS,
    );
  });

  it("keeps readable gap between title, subtitle, and Step 4 footer band", async () => {
    const { parsed } = await exportWorksheet({
      localLabel: "Local 243",
      locale: "en",
    });

    const titleY = findTextY(parsed, "Land acknowledgement");
    const subtitleY = findTextY(parsed, "Solo draft or group workshop");
    const step4Y = findTextY(parsed, "Step 4 — Review and commit");
    const tipsY = findTextY(parsed, "Floor tips");

    expect(titleY).toBeDefined();
    expect(subtitleY).toBeDefined();
    expect(step4Y).toBeDefined();
    expect(tipsY).toBeDefined();
    expect(titleY! - subtitleY!).toBeGreaterThan(10);
    expect(step4Y! - tipsY!).toBeGreaterThan(24);
    expect(step4Y! - tipsY!).toBeLessThan(125);
  });

  it("pins Step 4 just above the footer band without a large dead zone", async () => {
    const { parsed } = await exportWorksheet({
      localLabel: "Local 243",
      locale: "en",
    });

    const step4Y = findTextY(parsed, "Step 4 — Review and commit");
    const tipsY = findTextY(parsed, "Floor tips");
    expect(step4Y).toBeDefined();
    expect(tipsY).toBeDefined();
    expect(step4Y! - tipsY!).toBeLessThan(125);
  });

  it("renders Step 4 in main flow above floor tips in reading order", async () => {
    const { parsed } = await exportWorksheet({
      localLabel: "Local 243",
      locale: "en",
    });

    const step3Idx = parsed.items.findIndex((item) =>
      item.str.includes("Step 3 — Draft"),
    );
    const step4Idx = parsed.items.findIndex((item) =>
      item.str.includes("Step 4 — Review and commit"),
    );
    const tipsIdx = parsed.items.findIndex((item) =>
      item.str.includes("Floor tips"),
    );

    expect(step3Idx).toBeGreaterThan(-1);
    expect(step4Idx).toBeGreaterThan(step3Idx);
    expect(tipsIdx).toBeGreaterThan(step4Idx);
  });

  it("places floor tips heading above tip bullets and education disclaimer", async () => {
    const { parsed } = await exportWorksheet({
      localLabel: "Local 243",
      locale: "en",
    });

    const tipsY = findTextY(parsed, "Floor tips");
    const bulletY = findTextY(parsed, "Territory first");
    const reminderY = findTextY(parsed, "Education only");
    const footerY = findTextY(parsed, "UnionOps Comms");

    expect(tipsY).toBeDefined();
    expect(bulletY).toBeDefined();
    expect(reminderY).toBeDefined();
    expect(footerY).toBeDefined();
    expect(tipsY!).toBeGreaterThan(bulletY!);
    expect(bulletY!).toBeGreaterThan(reminderY!);
    expect(reminderY!).toBeGreaterThan(footerY!);
  });

  it("passes layoutWorksheet one-page budget for EN template shape", () => {
    const budget = layoutWorksheet({
      title: "Land acknowledgement — floor handout",
      subtitle: "Local 243",
      layoutMode: "flow",
      sections: [
        {
          heading: "Before you start",
          lines: [{ kind: "fieldPair", left: { label: "Local" }, right: { label: "Date" } }],
        },
        {
          heading: "Step 3 — Draft",
          lines: [{ kind: "ruled", count: LAND_ACK_DRAFT_ROWS, rowHeight: 15 }],
        },
        {
          heading: "Step 4 — Review and commit",
          lines: [{ kind: "checkPair", left: "Accurate", right: "Explainable" }],
        },
      ],
      tips: {
        heading: "Floor tips",
        lines: ["Territory first."],
      },
      reminder: "Education only.",
      footer: COMMS_GUIDE_FOOTER.en,
    });
    expect(budget.errors).toHaveLength(0);
    expect(budget.fitsOnePage).toBe(true);
  });

  it("renders Step 4 review pairs in two columns using the full page width", async () => {
    const { parsed } = await exportWorksheet({
      localLabel: "Local 243",
      locale: "en",
    });

    expectPairUsesRowColumns(
      parsed,
      "Accurate for this territory",
      "Speaker can explain",
    );
    expect(parsed.joined).toMatch(/without notes/i);
  });

  it("keeps breathable gap between field rules and the next label", async () => {
    const { parsed } = await exportWorksheet({
      localLabel: "Local 243",
      locale: "en",
    });

    expectMinFieldBlockGap(parsed, "Nations for where we meet", "Treaties / agreements");
  });

  it("includes comms education footer copy for each locale", async () => {
    const en = await exportWorksheet({ localLabel: "Local 243", locale: "en" });
    const fr = await exportWorksheet({ localLabel: "Section 243", locale: "fr" });

    expect(en.parsed.joined).toContain(COMMS_GUIDE_FOOTER.en);
    expect(fr.parsed.joined).toContain(COMMS_GUIDE_FOOTER.fr);
  });
});
