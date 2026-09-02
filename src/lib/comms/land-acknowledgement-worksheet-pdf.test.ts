import { describe, expect, it } from "vitest";
import { downloadLandAcknowledgementWorksheetPdf } from "./land-acknowledgement-worksheet-pdf";

describe("land-acknowledgement-worksheet-pdf", () => {
  it("exports EN worksheet without throwing", async () => {
    await expect(
      downloadLandAcknowledgementWorksheetPdf({
        localLabel: "Local 243",
        locale: "en",
      }),
    ).resolves.toBeUndefined();
  });

  it("exports FR worksheet without throwing", async () => {
    await expect(
      downloadLandAcknowledgementWorksheetPdf({
        localLabel: "Section 243",
        locale: "fr",
      }),
    ).resolves.toBeUndefined();
  });
});
