import { describe, expect, it, vi } from "vitest";
import { downloadLandAcknowledgementWorksheetPdf } from "./land-acknowledgement-worksheet-pdf";

vi.mock("@/lib/export/save-blob", () => ({
  saveBlob: vi.fn(async () => undefined),
}));

import { saveBlob } from "@/lib/export/save-blob";

describe("land-acknowledgement-worksheet-pdf", () => {
  it("exports EN worksheet on one page with Brand Kit fonts", async () => {
    vi.mocked(saveBlob).mockClear();
    await downloadLandAcknowledgementWorksheetPdf({
      localLabel: "Local 243",
      locale: "en",
      brand: {
        headlineFontId: "montserrat",
        bodyFontId: "sourceSans",
        primaryColor: "#C2410C",
      },
    });

    const [blob] = vi.mocked(saveBlob).mock.calls.at(-1)!;
    const data = new Uint8Array(await blob.arrayBuffer());
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data }).promise;
    expect(doc.numPages).toBe(1);

    const page = await doc.getPage(1);
    const text = await page.getTextContent();
    const joined = text.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    expect(joined).toMatch(/UnionOps Comms/i);
  });

  it("exports FR worksheet on one page without throwing", async () => {
    vi.mocked(saveBlob).mockClear();
    await expect(
      downloadLandAcknowledgementWorksheetPdf({
        localLabel: "Section 243",
        locale: "fr",
      }),
    ).resolves.toBeUndefined();

    const [blob] = vi.mocked(saveBlob).mock.calls.at(-1)!;
    const data = new Uint8Array(await blob.arrayBuffer());
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data }).promise;
    expect(doc.numPages).toBe(1);
  });
});
