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
  renderDocx,
  renderPptx,
  renderXlsx,
} from "./office-export";

const sampleLetterPath = join(
  process.cwd(),
  "public/templates/office/docx/sample-letter.docx",
);
const sampleRosterPath = join(
  process.cwd(),
  "public/templates/office/xlsx/sample-roster.xlsx",
);
const eventRedPath = join(
  process.cwd(),
  "public/templates/office/docx/quick-event_red.docx",
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

  it("caches template buffers and returns independent copies", async () => {
    mockFetchFromFile(sampleLetterPath);
    const a = await loadTemplateBuffer("/templates/office/docx/sample-letter.docx");
    const b = await loadTemplateBuffer("/templates/office/docx/sample-letter.docx");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a.byteLength).toBe(b.byteLength);
    expect(a).not.toBe(b);
    new Uint8Array(a)[0] = 0xff;
    expect(new Uint8Array(b)[0]).not.toBe(0xff);
  });

  it("throws when the template is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404 })),
    );
    await expect(
      loadTemplateBuffer("/templates/office/docx/missing.docx"),
    ).rejects.toThrow(/Template not found/);
  });

  it("renders a docx template and downloads a blob", async () => {
    mockFetchFromFile(sampleLetterPath);
    await exportDocx({
      templateUrl: "/templates/office/docx/sample-letter.docx",
      filename: "letter-local-110.docx",
      data: {
        localNumber: "110",
        memberName: "Alex",
        body: "This is a test.",
        stewardName: "Jordan",
        items: [{ label: "Step", detail: "One" }],
      },
    });

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0]!;
    expect(filename).toBe("letter-local-110.docx");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("renderDocx returns a blob without downloading", async () => {
    mockFetchFromFile(eventRedPath);
    const blob = await renderDocx({
      templateUrl: "/templates/office/docx/quick-event_red.docx",
      data: {
        localNumber: "110",
        title: "Meeting",
        subtitle: "All welcome",
        date: "Aug 12",
        time: "Noon",
        location: "Cafeteria",
        body: "Agenda",
        contactName: "LEC",
      },
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it("fills an xlsx template and downloads a blob", async () => {
    mockFetchFromFile(sampleRosterPath);
    await exportXlsx({
      templateUrl: "/templates/office/xlsx/sample-roster.xlsx",
      filename: "roster-local-110.xlsx",
      fill: (workbook) => {
        const sheet = workbook.getWorksheet("Roster");
        expect(sheet).toBeDefined();
        sheet!.getCell("B1").value = "110";
        sheet!.getCell("A4").value = "Alex";
        sheet!.getCell("B4").value = "Steward";
        sheet!.getCell("C4").value = "alex@example.org";
      },
    });

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0]!;
    expect(filename).toBe("roster-local-110.xlsx");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("renderXlsx returns a blob without downloading", async () => {
    mockFetchFromFile(sampleRosterPath);
    const blob = await renderXlsx({
      templateUrl: "/templates/office/xlsx/sample-roster.xlsx",
      fill: (workbook) => {
        workbook.getWorksheet("Roster")!.getCell("B1").value = "110";
      },
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it("renderPptx builds a multi-slide branded deck", async () => {
    const blob = await renderPptx({
      title: "Membership meeting",
      subtitle: "All welcome",
      body: "Bring your questions.",
      localLabel: "Local 110",
      palette: {
        primary: "#9E1B32",
        secondary: "#5C0A1A",
        accent: "#C45C26",
      },
      fields: {
        date: "Aug 12",
        time: "Noon",
        location: "Cafeteria",
        contactName: "LEC",
      },
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("exportOfficeBundle zips multiple files", async () => {
    const a = new Blob(["hello"], { type: "text/plain" });
    const b = new Blob(["world"], { type: "text/plain" });
    await exportOfficeBundle({
      zipFilename: "pack-local-110.zip",
      files: [
        { name: "a.docx", blob: a },
        { name: "b.pptx", blob: Promise.resolve(b) },
      ],
    });
    expect(downloadZip).toHaveBeenCalledTimes(1);
    const [files, name] = vi.mocked(downloadZip).mock.calls[0]!;
    expect(name).toBe("pack-local-110.zip");
    expect(files).toHaveLength(2);
    expect(files[0]!.name).toBe("a.docx");
    expect(files[1]!.name).toBe("b.pptx");
  });
});
