import { describe, expect, it, vi } from "vitest";
import { COMMS_GUIDE_FOOTER } from "@/lib/export/text-pdf-layout";
import { expectHeadingOrder, parseWorksheetPdfBlob } from "@/lib/export/worksheet-pdf-test-helpers";
import { downloadStrikeStandingBriefPdf } from "./strike-standing-brief-pdf";

vi.mock("@/lib/export/save-blob", () => ({
  saveBlob: vi.fn(async () => undefined),
}));

import { saveBlob } from "@/lib/export/save-blob";

async function exportBrief(
  opts: Parameters<typeof downloadStrikeStandingBriefPdf>[0],
) {
  vi.mocked(saveBlob).mockClear();
  await downloadStrikeStandingBriefPdf(opts);
  const [blob, filename] = vi.mocked(saveBlob).mock.calls.at(-1)!;
  const parsed = await parseWorksheetPdfBlob(blob);
  return { blob, filename, parsed };
}

describe("strike-standing-brief-pdf", () => {
  it("exports EN captains' brief on one page with named command and no invented amounts", async () => {
    const { filename, parsed } = await exportBrief({
      localLabel: "Local 243",
      locale: "en",
      brand: {
        headlineFontId: "montserrat",
        bodyFontId: "sourceSans",
        primaryColor: "#C2410C",
      },
    });

    expect(filename).toBe("unionops-strike-standing-brief.pdf");
    expect(parsed.numPages).toBe(1);
    expect(parsed.joined).toMatch(/Captains' standing brief/i);
    expect(parsed.joined).toMatch(/Local 243/);
    expect(parsed.joined).toContain(COMMS_GUIDE_FOOTER.en);
    expect(parsed.joined).toMatch(/Staff Representative/i);
    expect(parsed.joined).toMatch(/no invented amount/i);
    expect(parsed.joined).not.toMatch(/\$\d/);
    expect(parsed.joined).not.toMatch(/three messages/i);

    expectHeadingOrder(parsed, [
      "Who carries this",
      "Named command",
      "Gate facts",
      "Before the shift",
      "Floor tips",
    ]);
  });

  it("exports FR brief on one page with matching claim", async () => {
    const { filename, parsed } = await exportBrief({
      localLabel: "Section 243",
      locale: "fr",
    });

    expect(filename).toBe("unionops-consigne-permanente-greve.pdf");
    expect(parsed.numPages).toBe(1);
    expect(parsed.joined).toMatch(/Consigne permanente des capitaines/i);
    expect(parsed.joined).toMatch(/Section 243/);
    expect(parsed.joined).toContain(COMMS_GUIDE_FOOTER.fr);
    expect(parsed.joined).toMatch(/Représentant de service/i);
    expect(parsed.joined).toMatch(/aucun montant inventé/i);
    expect(parsed.joined).not.toMatch(/\$\d/);

    expectHeadingOrder(parsed, [
      "Qui porte cette feuille",
      "Commandement nommé",
      "Faits à l'entrée",
      "Avant le quart",
      "Conseils sur le plancher",
    ]);
  });
});
