import { describe, expect, it, vi } from "vitest";
import { COMMS_GUIDE_FOOTER, writeBrandedWorksheetPdf } from "@/lib/export/text-pdf-layout";
import { transparentPngBytes } from "@/lib/export/brand-logo-bytes";
import {
  countWorksheetStrokeOps,
  expectHeadingOrder,
  findTextY,
  parseWorksheetPdfBlob,
} from "@/lib/export/worksheet-pdf-test-helpers";
import { downloadLandAcknowledgementWorksheetPdf } from "./land-acknowledgement-worksheet-pdf";

/** Layout contract — keep in sync with land-acknowledgement-worksheet-pdf.ts */
const DRAFT_RULED_ROW_COUNT = 7;
const REFLECT_RULED_ROW_COUNT = 2;

vi.mock("@/lib/export/save-blob", () => ({
  saveBlob: vi.fn(async () => undefined),
}));

import { saveBlob } from "@/lib/export/save-blob";

async function exportUncappedFillBaseline() {
  const markBytes = transparentPngBytes();
  const mark = {
    bytes: markBytes,
    widthPx: 192,
    heightPx: 96,
    src: `data:image/png;base64,${Buffer.from(markBytes).toString("base64")}`,
  };
  vi.mocked(saveBlob).mockClear();
  await writeBrandedWorksheetPdf({
    platformMark: mark,
    title: "Land acknowledgement — floor handout",
    subtitle: "Local 243",
    sections: [
      {
        heading: "Before you start",
        lines: [
          {
            kind: "fieldPair",
            left: { label: "Local / committee" },
            right: { label: "Date" },
          },
        ],
      },
      {
        heading: "Step 1 — Research",
        lines: [{ kind: "field", label: "Nations for where we meet" }],
      },
      {
        heading: "Step 2 — Reflect",
        lines: [
          { kind: "text", text: "Why acknowledgement matters:" },
          { kind: "ruled", count: REFLECT_RULED_ROW_COUNT, rowHeight: 17 },
        ],
      },
      {
        heading: "Step 3 — Draft",
        lines: [
          { kind: "text", text: "Draft in your own words:" },
          { kind: "ruled", fill: true, minRows: 5, rowHeight: 17 },
        ],
      },
      {
        heading: "Step 4 — Review and commit",
        lines: [
          {
            kind: "checkPair",
            left: "Accurate for this territory",
            right: "Speaker can explain every phrase",
          },
        ],
      },
    ],
    tips: {
      heading: "Floor tips",
      lines: ["Territory first."],
    },
    reminder: "Education only.",
    filename: "unionops-land-ack-fill-baseline.pdf",
    footer: COMMS_GUIDE_FOOTER.en,
  });
  const [blob] = vi.mocked(saveBlob).mock.calls.at(-1)!;
  const parsed = await parseWorksheetPdfBlob(blob);
  return countWorksheetStrokeOps(parsed.page);
}

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
    expect(step4Y!).toBeGreaterThan(120);
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

  it("uses fewer ruled strokes than an uncapped fill baseline (regression)", async () => {
    const { strokeOps: templateStrokes } = await exportWorksheet({
      localLabel: "Local 243",
      locale: "en",
    });
    const fillBaselineStrokes = await exportUncappedFillBaseline();

    expect(templateStrokes).toBeLessThan(fillBaselineStrokes - 8);
  });

  it("uses fixed draft and reflect ruled rows (not uncapped fill)", async () => {
    const { strokeOps: enStrokes } = await exportWorksheet({
      localLabel: "Local 243",
      locale: "en",
    });

    const expectedMinimum =
      REFLECT_RULED_ROW_COUNT + DRAFT_RULED_ROW_COUNT + 4;
    expect(enStrokes).toBeGreaterThanOrEqual(expectedMinimum);
  });

  it("does not use closingSections pin — Step 4 follows Step 3 in the body flow", async () => {
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
