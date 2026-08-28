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
  renderSeniorityWorksheetXlsx,
  renderGrievanceIntakeXlsx,
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

  it("renderDocxFromPreset seniority-worksheet succeeds", async () => {
    const blob = await renderDocxFromPreset({
      presetId: "seniority-worksheet",
      palette: {
        primary: "#003366",
        secondary: "#001a33",
        accent: "#c45c26",
      },
      localLabel: "Local 110",
      localNumber: "110",
      fields: {
        sessionDate: "2026-07-26",
        chair: "Alex",
        caseId: "bump-1",
        committeeNotes: "Aid only",
      },
      seniorityLabels: {
        sheetName: "Seniority",
        title: "Seniority & bumping worksheet",
        local: "Local",
        sessionDate: "Session date",
        chair: "Chair",
        caseId: "Case ID",
        notes: "Notes",
        disclaimer: "Aid only",
        columns: ["Member ref", "Eligible?"],
        footerDecision: "Decision summary",
      },
    });
    expect(blob.size).toBeGreaterThan(8000);
  });

  it("renderDocxFromPreset grievance-intake succeeds", async () => {
    const blob = await renderDocxFromPreset({
      presetId: "grievance-intake",
      palette: {
        primary: "#003366",
        secondary: "#001a33",
        accent: "#c45c26",
      },
      localLabel: "Local 110",
      localNumber: "110",
      fields: {
        incidentDate: "2026-08-26",
        caArticle: "Art. 7",
        who: "",
      },
      grievanceLabels: {
        sheetName: "Intake",
        title: "Grievance intake (6 W's)",
        local: "Local",
        incidentDate: "Incident date",
        caArticle: "CA article",
        itemCol: "Item",
        notesCol: "Notes",
        witnesses: "Witnesses",
        clockNotes: "Clock notes",
        disclaimer: "Aid only",
        rows: {
          who: "Who",
          what: "What",
          where: "Where",
          when: "When",
          why: "Why",
          want: "Want",
        },
      },
    });
    expect(blob.size).toBeGreaterThan(8000);
  });

  it(
    "renderEventRsvpXlsx builds a Brand Kit workbook with response columns",
    async () => {
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

      const excelMod = await import("exceljs");
      const ExcelNS = (excelMod.default ?? excelMod) as typeof import("exceljs");
      const wb = new ExcelNS.Workbook();
      await wb.xlsx.load(await blob.arrayBuffer());
      const ws = wb.getWorksheet("RSVP");
      expect(ws).toBeTruthy();
      expect(ws!.getCell("A8").value).toBe("Quorum board");
      expect(ws!.getCell("A9").value).toBe("Food order (on site)");
      expect(ws!.getCell("A11").value).toBe("Name");
      expect(ws!.getCell("E11").value).toBe("Attending");
      expect(ws!.getCell("F11").value).toBe("How joining");
      expect(ws!.getCell("G11").value).toBe("Guests (on site)");
      expect(ws!.getCell("H11").value).toBe("Dietary");
      const foodHeads = ws!.getCell("G9").value;
      const foodFormula =
        typeof foodHeads === "object" && foodHeads && "formula" in foodHeads
          ? String((foodHeads as { formula: string }).formula)
          : String(foodHeads);
      expect(foodFormula).toContain("COUNTIFS");
      expect(foodFormula).toContain("On site");
    },
    20_000,
  );

  it(
    "renderSeniorityWorksheetXlsx builds branded blank eligibility grid",
    async () => {
      const blob = await renderSeniorityWorksheetXlsx({
        palette: { primary: "#003366", secondary: "#001a33", accent: "#c45c26" },
        localNumber: "110",
        fields: {
          sessionDate: "2026-07-26",
          chair: "Alex",
          caseId: "bump-1",
          committeeNotes: "Aid only",
        },
        labels: {
          sheetName: "Seniority",
          title: "Seniority & bumping worksheet",
          local: "Local",
          sessionDate: "Session date",
          chair: "Chair",
          caseId: "Case ID",
          notes: "Notes",
          disclaimer: "Aid only",
          columns: [
            "Member ref",
            "Seniority date",
            "Classification",
            "Current position",
            "Target / bump claim",
            "Eligible?",
            "Notes / CA article",
          ],
          footerDecision: "Decision summary",
        },
      });
      expect(blob.size).toBeGreaterThan(1000);

      const excelMod = await import("exceljs");
      const ExcelNS = (excelMod.default ?? excelMod) as typeof import("exceljs");
      const wb = new ExcelNS.Workbook();
      await wb.xlsx.load(await blob.arrayBuffer());
      const ws = wb.getWorksheet("Seniority");
      expect(ws).toBeTruthy();
      expect(ws!.getCell("A1").value).toBe("Seniority & bumping worksheet");
      expect(ws!.getCell("B2").value).toBe("110");
      expect(ws!.getCell("A8").value).toBe("Member ref");
      expect(ws!.getCell("F8").value).toBe("Eligible?");
    },
    20_000,
  );

  it(
    "renderGrievanceIntakeXlsx builds branded blank 6 W's sheet",
    async () => {
      const blob = await renderGrievanceIntakeXlsx({
        palette: { primary: "#003366", secondary: "#001a33", accent: "#c45c26" },
        localNumber: "110",
        fields: {
          incidentDate: "2026-08-26",
          caArticle: "Art. 7",
          who: "",
          what: "",
        },
        labels: {
          sheetName: "Intake",
          title: "Grievance intake (6 W's)",
          local: "Local",
          incidentDate: "Incident date",
          caArticle: "CA article",
          itemCol: "Item",
          notesCol: "Notes",
          witnesses: "Witnesses",
          clockNotes: "Clock notes",
          disclaimer: "Aid only",
          rows: {
            who: "Who",
            what: "What",
            where: "Where",
            when: "When",
            why: "Why",
            want: "Want",
          },
        },
      });
      expect(blob.size).toBeGreaterThan(1000);

      const excelMod = await import("exceljs");
      const ExcelNS = (excelMod.default ?? excelMod) as typeof import("exceljs");
      const wb = new ExcelNS.Workbook();
      await wb.xlsx.load(await blob.arrayBuffer());
      const ws = wb.getWorksheet("Intake");
      expect(ws).toBeTruthy();
      expect(ws!.getCell("A1").value).toBe("Grievance intake (6 W's)");
      expect(ws!.getCell("B2").value).toBe("110");
      expect(ws!.getCell("B3").value).toBe("2026-08-26");
      expect(ws!.getCell("A7").value).toBe("Who");
      expect(ws!.getCell("B7").value).toBe("");
    },
    20_000,
  );

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

  it("renderDocxFromPreset embeds Brand Kit Office face names", async () => {
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
      headlineFont: "Oswald",
      bodyFont: "Source Sans 3",
    });
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const headerXml = await zip.file("word/header1.xml")!.async("string");
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(headerXml).toContain("Oswald");
    expect(docXml).toContain("Source Sans 3");
    expect(docXml).not.toContain("Calibri");
  });

  it("renderPptx embeds Brand Kit Office face names", async () => {
    const blob = await renderPptx({
      presetId: "quick-event",
      title: "Meeting",
      localLabel: "Local 110",
      palette: {
        primary: "#003366",
        secondary: "#001a33",
        accent: "#c45c26",
      },
      fields: { date: "Aug 12", location: "Hall" },
      headlineFont: "Oswald",
      bodyFont: "Source Sans 3",
    });
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const slideFiles = Object.keys(zip.files).filter(
      (n) => n.startsWith("ppt/slides/slide") && n.endsWith(".xml"),
    );
    expect(slideFiles.length).toBeGreaterThan(0);
    const xml = (
      await Promise.all(slideFiles.map((n) => zip.file(n)!.async("string")))
    ).join("\n");
    expect(xml).toContain('typeface="Oswald"');
    expect(xml).toContain('typeface="Source Sans 3"');
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
