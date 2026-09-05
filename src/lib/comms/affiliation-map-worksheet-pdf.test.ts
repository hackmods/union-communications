import { describe, expect, it, vi } from "vitest";
import { COMMS_GUIDE_FOOTER } from "@/lib/export/text-pdf-layout";
import {
  expectHeadingOrder,
  expectMinVerticalGap,
  findTextY,
  parseWorksheetPdfBlob,
} from "@/lib/export/worksheet-pdf-test-helpers";
import { downloadAffiliationMapWorksheetPdf } from "./affiliation-map-worksheet-pdf";

vi.mock("@/lib/export/save-blob", () => ({
  saveBlob: vi.fn(async () => undefined),
}));

import { saveBlob } from "@/lib/export/save-blob";

async function exportWorksheet(
  opts: Parameters<typeof downloadAffiliationMapWorksheetPdf>[0],
) {
  vi.mocked(saveBlob).mockClear();
  await downloadAffiliationMapWorksheetPdf(opts);
  const [blob, filename] = vi.mocked(saveBlob).mock.calls.at(-1)!;
  const parsed = await parseWorksheetPdfBlob(blob);
  return { blob, filename, parsed };
}

describe("affiliation-map-worksheet-pdf", () => {
  it("exports EN floor handout on one page with both tracks", async () => {
    const { filename, parsed } = await exportWorksheet({
      localLabel: "Local 243",
      locale: "en",
      brand: {
        headlineFontId: "montserrat",
        bodyFontId: "sourceSans",
        primaryColor: "#C2410C",
      },
    });

    expect(filename).toBe("unionops-affiliation-map.pdf");
    expect(parsed.numPages).toBe(1);
    expect(parsed.joined).toMatch(/Affiliation map: floor handout/i);
    expect(parsed.joined).toMatch(/Local 243/);
    expect(parsed.joined).toMatch(/UnionOps Comms/i);
    expect(parsed.joined).toMatch(/Floor tips/i);
    expect(parsed.joined).toMatch(/Teaching map only/i);
    expect(parsed.joined.replace(COMMS_GUIDE_FOOTER.en, "")).not.toContain(
      "\u2014",
    );

    expectHeadingOrder(parsed, [
      "Your local",
      "Union family",
      "Geographic house",
      "Confirm before you speak",
      "Floor tips",
    ]);

    expect(parsed.joined).toMatch(/Parent union/i);
    expect(parsed.joined).toMatch(/Labour council/i);
    expect(parsed.joined).toMatch(/National federation \(or none\)/i);
    expect(parsed.joined).toMatch(/Council secretary confirmed standing/i);
    expect(parsed.joined).toContain(COMMS_GUIDE_FOOTER.en);

    const confirmY = findTextY(parsed, "Confirm before you speak");
    const tipsY = findTextY(parsed, "Floor tips");
    expect(confirmY).toBeDefined();
    expect(tipsY).toBeDefined();
    expectMinVerticalGap(parsed, "Confirm before you speak", "Floor tips", 20);
  });

  it("exports FR floor handout with matching claims and French filename", async () => {
    const { filename, parsed } = await exportWorksheet({
      localLabel: "Section 243",
      locale: "fr",
      brand: {
        headlineFontId: "montserrat",
        bodyFontId: "sourceSans",
        primaryColor: "#C2410C",
      },
    });

    expect(filename).toBe("unionops-carte-affiliation.pdf");
    expect(parsed.numPages).toBe(1);
    expect(parsed.joined).toMatch(/Carte d'affiliation : feuille de terrain/i);
    expect(parsed.joined).toMatch(/Section 243/);
    expect(parsed.joined).toMatch(/Famille syndicale/i);
    expect(parsed.joined).toMatch(/Maison géographique/i);
    expect(parsed.joined).toMatch(/Confirmez avant de parler/i);
    expect(parsed.joined).toMatch(/conseil du travail/i);
    expect(parsed.joined.replace(COMMS_GUIDE_FOOTER.fr, "")).not.toContain(
      "\u2014",
    );
    expect(parsed.joined).toContain(COMMS_GUIDE_FOOTER.fr);
  });
});
