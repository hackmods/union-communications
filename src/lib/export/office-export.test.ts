import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/export/image-export", () => ({
  downloadBlob: vi.fn(),
  downloadZip: vi.fn(),
}));

import { downloadBlob, downloadZip } from "@/lib/export/image-export";
import {
  clearOfficeTemplateCache,
  exportDocx,
  exportOfficeBundle,
  exportXlsx,
  loadTemplateBuffer,
  renderDocxFromPreset,
  renderEventRsvpXlsx,
  renderPptx,
} from "./office-export";
import { transparentPngBytes } from "./brand-logo-bytes";

const sampleLetterPath = join(
  process.cwd(),
  "public/templates/office/docx/sample-letter.docx",
);
const sampleRosterPath = join(
  process.cwd(),
  "public/templates/office/xlsx/sample-roster.xlsx",
);

function mockFetchFromFile(path: string) {
  const bytes = readFileSync(path);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () =>
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
    })),
  );
}

describe("office-export", () => {
  beforeEach(() => {
    clearOfficeTemplateCache();
    vi.mocked(downloadBlob).mockReset();
    vi.mocked(downloadZip).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearOfficeTemplateCache();
  });

  it("caches template buffers", async () => {
    mockFetchFromFile(sampleLetterPath);
    await loadTemplateBuffer("/templates/office/docx/sample-letter.docx");
    await loadTemplateBuffer("/templates/office/docx/sample-letter.docx");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("renders legacy sample-letter via docxtemplater", async () => {
    mockFetchFromFile(sampleLetterPath);
    await exportDocx({
      templateUrl: "/templates/office/docx/sample-letter.docx",
      filename: "letter-local-110.docx",
      data: {
        localNumber: "110",
        memberName: "Alex",
        body: "Test",
        stewardName: "Jordan",
        items: [],
      },
    });
    expect(downloadBlob).toHaveBeenCalledTimes(1);
  });

  it("renderDocxFromPreset simple-letter succeeds with logo", async () => {
    const blob = await renderDocxFromPreset({
      presetId: "simple-letter",
      palette: {
        primary: "#9E1B32",
        secondary: "#5C0A1A",
        accent: "#C45C26",
      },
      localLabel: "Local 110",
      fields: {
        date: "July 15",
        memberName: "Alex",
        body: "Hello",
        stewardName: "Jordan",
        contactName: "LEC",
      },
      logo: {
        bytes: transparentPngBytes(),
        extension: "png",
        widthPx: 120,
        heightPx: 48,
        src: "",
      },
    });
    expect(blob.size).toBeGreaterThan(8000);
  });

  it("renderEventRsvpXlsx builds a Brand Kit workbook", async () => {
    const blob = await renderEventRsvpXlsx({
      palette: { primary: "#003366", secondary: "#001a33", accent: "#c45c26" },
      localNumber: "110",
      fields: {
        title: "Meeting",
        date: "Aug 12",
        time: "Noon",
        location: "Hall",
        contactName: "LEC",
      },
    });
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("fills sample roster xlsx", async () => {
    mockFetchFromFile(sampleRosterPath);
    await exportXlsx({
      templateUrl: "/templates/office/xlsx/sample-roster.xlsx",
      filename: "roster-local-110.xlsx",
      fill: (wb) => {
        wb.getWorksheet("Roster")!.getCell("B1").value = "110";
      },
    });
    expect(downloadBlob).toHaveBeenCalledTimes(1);
  });

  it("renderPptx builds event and letter decks", async () => {
    const event = await renderPptx({
      presetId: "quick-event",
      title: "Meeting",
      localLabel: "Local 110",
      palette: {
        primary: "#003366",
        secondary: "#001a33",
        accent: "#c45c26",
      },
      fields: { date: "Aug 12", location: "Hall" },
    });
    const letter = await renderPptx({
      presetId: "simple-letter",
      title: "",
      localLabel: "Local 110",
      palette: {
        primary: "#003366",
        secondary: "#001a33",
        accent: "#c45c26",
      },
      fields: { memberName: "Alex", body: "Hi", stewardName: "Jordan" },
    });
    expect(event.size).toBeGreaterThan(1000);
    expect(letter.size).toBeGreaterThan(500);
  });

  it("exportOfficeBundle zips files", async () => {
    await exportOfficeBundle({
      zipFilename: "pack.zip",
      files: [
        { name: "a.docx", blob: new Blob(["a"]) },
        { name: "b.pptx", blob: Promise.resolve(new Blob(["b"])) },
      ],
    });
    expect(downloadZip).toHaveBeenCalledTimes(1);
  });
});
