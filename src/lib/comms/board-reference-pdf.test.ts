import { describe, expect, it, vi } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { COMMS_GUIDE_FOOTER, guidePdfBrandFromKit } from "@/lib/export/text-pdf-layout";

vi.mock("@/lib/export/save-blob", () => ({
  saveBlob: vi.fn(async () => undefined),
}));

import { saveBlob } from "@/lib/export/save-blob";
import { downloadBoardReferencePdf } from "./board-reference-pdf";

describe("downloadBoardReferencePdf", () => {
  const brand = guidePdfBrandFromKit(DEFAULT_BRAND_KIT);

  it("writes branded board print checklist PDFs for EN and FR", async () => {
    vi.mocked(saveBlob).mockClear();
    await downloadBoardReferencePdf({
      kind: "board-checklist",
      localLabel: "Local 243",
      locale: "en",
      brand,
    });
    await downloadBoardReferencePdf({
      kind: "board-checklist",
      localLabel: "Local 243",
      locale: "fr",
      brand,
    });
    expect(saveBlob).toHaveBeenCalledTimes(2);
    expect(vi.mocked(saveBlob).mock.calls[0]?.[1]).toBe(
      "unionops-board-print-checklist-en.pdf",
    );
    expect(vi.mocked(saveBlob).mock.calls[1]?.[1]).toBe(
      "unionops-board-print-checklist-fr.pdf",
    );
  });

  it("writes OHSA QR tip PDF with comms guide footer", async () => {
    vi.mocked(saveBlob).mockClear();
    await downloadBoardReferencePdf({
      kind: "ohsa-qr-tip",
      localLabel: "Local 243",
      locale: "en",
      brand,
    });
    expect(saveBlob).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveBlob).mock.calls[0]?.[1]).toBe(
      "unionops-ohsa-qr-tip-en.pdf",
    );
    const blob = vi.mocked(saveBlob).mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe("application/pdf");
    expect(COMMS_GUIDE_FOOTER.en).toContain("UnionOps Comms");
  });
});
