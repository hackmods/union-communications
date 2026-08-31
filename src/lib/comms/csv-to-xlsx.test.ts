import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/export/image-export", () => ({
  downloadBlob: vi.fn(async () => undefined),
}));

import { downloadBlob } from "@/lib/export/image-export";
import { downloadCsvAsXlsx } from "./csv-to-xlsx";

describe("downloadCsvAsXlsx", () => {
  beforeEach(() => {
    vi.mocked(downloadBlob).mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => "Campus,Monitor\nNorth,F. Example\n",
      })),
    );
  });

  it("converts a fetched CSV to an xlsx download", async () => {
    await downloadCsvAsXlsx(
      "/demo/union-boards/board-tracker-sample.csv",
      "board-tracker-sample.csv",
    );
    expect(fetch).toHaveBeenCalledWith(
      "/demo/union-boards/board-tracker-sample.csv",
    );
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0] ?? [];
    expect(filename).toBe("board-tracker-sample.xlsx");
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toContain("spreadsheetml");
  });

  it("throws when CSV fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404 })),
    );
    await expect(
      downloadCsvAsXlsx("/missing.csv", "missing.csv"),
    ).rejects.toThrow(/Could not load spreadsheet template/);
  });
});
