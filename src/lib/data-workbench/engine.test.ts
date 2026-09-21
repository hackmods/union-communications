import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { applyMapping, suggestMapping, validateMappedRow } from "./mapping";
import { resolveByIdentifier, normalizePersonName } from "./resolution";
import { parseUploadedTable } from "./table-parser";
import { parsePage } from "./pagination";

describe("UnionOps Data table ingestion", () => {
  it("parses multiline CSV and preserves accents and leading-zero identifiers", async () => {
    const bytes = Buffer.from('Numéro de membre,Nom,Notes\r\n"00123","Élodie Martin","line one\nline two, with a comma"\r\n', "utf8");
    const table = await parseUploadedTable("members.csv", bytes);

    expect(table.headers).toEqual(["Numéro de membre", "Nom", "Notes"]);
    expect(table.rows[0]).toEqual({
      "Numéro de membre": "00123",
      Nom: "Élodie Martin",
      Notes: "line one\nline two, with a comma",
    });
  });

  it("rejects duplicate headers and malformed quoted CSV", async () => {
    await expect(parseUploadedTable("bad.csv", Buffer.from("id,ID\n1,2\n"))).rejects.toThrow("headers must be unique");
    await expect(parseUploadedTable("bad.csv", Buffer.from('id,name\n1,"not closed\n'))).rejects.toThrow("not closed");
  });

  it("suggests French member fields while leaving unrelated sensitive columns staged", () => {
    const mapping = suggestMapping(["Numéro de membre", "Nom complet", "Courriel", "NAS"], "member_employment");
    expect(mapping).toEqual({
      "Numéro de membre": "memberNumber",
      "Nom complet": "fullName",
      Courriel: "email",
      NAS: null,
    });
    expect(applyMapping({ "Numéro de membre": "00123", "Nom complet": "", Courriel: "", NAS: "123-456-789" }, mapping)).toEqual({ memberNumber: "00123", fullName: "", email: "" });
  });

  it("rejects impossible or reversed effective dates", () => {
    expect(validateMappedRow({ fullName: "Alex", effectiveFrom: "2024-02-31" }, "member_employment")).toContain("Effective from must be a valid date in YYYY-MM-DD format.");
    expect(validateMappedRow({ fullName: "Alex", effectiveFrom: "2024-06-01", effectiveTo: "2024-05-31" }, "member_employment")).toContain("Effective to cannot be earlier than effective from.");
  });

  it("rejects formula cells in workbooks rather than evaluating them", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Roster");
    sheet.addRow(["Member #", "Name"]);
    sheet.addRow(["00123", { formula: "1+1", result: 2 }]);
    const bytes = Buffer.from(await workbook.xlsx.writeBuffer());

    await expect(parseUploadedTable("roster.xlsx", bytes)).rejects.toThrow("values only are accepted");
  });

  it("reads native Excel date cells as ISO dates and keeps identifiers as text", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Roster");
    sheet.addRow(["Member #", "Name", "Effective"]);
    sheet.addRow(["00123", "Alex Smith", new Date("2024-01-02T00:00:00.000Z")]);
    sheet.getColumn(3).numFmt = "yyyy-mm-dd";
    const bytes = Buffer.from(await workbook.xlsx.writeBuffer());

    const table = await parseUploadedTable("roster.xlsx", bytes);
    expect(table.rows[0]).toMatchObject({ "Member #": "00123", Effective: "2024-01-02" });
  });
});

describe("stable member identity resolution", () => {
  it("matches only a unique identifier in the configured namespace", () => {
    const candidates = [
      { id: "person-a", namespace: "union_member_number", value: "00123" },
      { id: "person-b", namespace: "employer_number", value: "00123" },
    ];
    expect(resolveByIdentifier({ namespace: "union_member_number", value: "00123", candidates })).toMatchObject({ personId: "person-a", conflict: false });
    expect(resolveByIdentifier({ namespace: "email", value: "same@example.test", candidates })).toMatchObject({ personId: null, conflict: false });
  });

  it("flags contradictory stable identifiers and normalizes names for suggestions", () => {
    expect(resolveByIdentifier({
      namespace: "union_member_number",
      value: "00123",
      candidates: [
        { id: "person-a", namespace: "union_member_number", value: "00123" },
        { id: "person-b", namespace: "union_member_number", value: "00123" },
      ],
    })).toMatchObject({ personId: null, conflict: true });
    expect(normalizePersonName("  Élodie   Martin ")).toBe("élodie martin");
  });
});

describe("data API pagination", () => {
  it("rejects non-finite offsets and caps requested page sizes", () => {
    expect(parsePage(new URLSearchParams("offset=Infinity&limit=999"))).toEqual({ offset: 0, limit: 200 });
    expect(parsePage(new URLSearchParams("offset=-1&limit=10"))).toEqual({ offset: 0, limit: 10 });
  });
});
