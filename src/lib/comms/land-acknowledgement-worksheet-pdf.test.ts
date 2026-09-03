import { describe, expect, it, vi } from "vitest";
import { COMMS_GUIDE_FOOTER, writeBrandedWorksheetPdf } from "@/lib/export/text-pdf-layout";
import { transparentPngBytes } from "@/lib/export/brand-logo-bytes";
import {
  countWorksheetStrokeOps,
  expectHeadingOrder,
  findTextY,
  parseWorksheetPdfBlob,
} from "@/lib/export/worksheet-pdf-test-helpers";
import {
  downloadLandAcknowledgementWorksheetPdf,
  LAND_ACK_DRAFT_MAX_ROWS,
  LAND_ACK_DRAFT_MIN_ROWS,
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
            minRows: LAND_ACK_DRAFT_MIN_ROWS,
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
              minRows: LAND_ACK_DRAFT_MIN_ROWS,
              maxRows: LAND_ACK_DRAFT_MAX_ROWS,
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
      REFLECT_RULED_ROW_COUNT + LAND_ACK_DRAFT_MIN_ROWS,
    );
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
    expect(step4Y! - tipsY!).toBeLessThan(110);
  });

  it("renders Step 4 in closingSections above floor tips in reading order", async () => {
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

  it("includes comms education footer copy for each locale", async () => {
    const en = await exportWorksheet({ localLabel: "Local 243", locale: "en" });
    const fr = await exportWorksheet({ localLabel: "Section 243", locale: "fr" });

    expect(en.parsed.joined).toContain(COMMS_GUIDE_FOOTER.en);
    expect(fr.parsed.joined).toContain(COMMS_GUIDE_FOOTER.fr);
  });
});
