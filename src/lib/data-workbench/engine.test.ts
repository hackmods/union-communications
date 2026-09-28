import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { filterEffectiveOn, isEffectiveOn, pickAssertionsAsOf } from "./as-of";
import {
  applyMapping,
  normalizeCanonicalValues,
  normalizeDuesStanding,
  suggestMapping,
  validateMappedRow,
} from "./mapping";
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

describe("observational dues and as-of reads", () => {
  it("maps dues standing aliases and rejects unknown standing values", () => {
    const mapping = suggestMapping(["Dues standing", "Classification", "Hire date"], "member_employment");
    expect(mapping).toEqual({
      "Dues standing": "duesStanding",
      Classification: "classification",
      "Hire date": "hireDate",
    });
    expect(normalizeDuesStanding("En règle")).toBe("good");
    expect(normalizeCanonicalValues({ duesStanding: "in arrears", membershipStatus: "Actif" })).toEqual({
      duesStanding: "arrears",
      membershipStatus: "active",
    });
    expect(validateMappedRow({ fullName: "Alex", duesStanding: "paid-up" }, "member_employment")).toContain(
      "Dues standing must be good, arrears, unknown, or exempt.",
    );
  });

  it("validates hire dates and normalizes French dues source aliases", () => {
    expect(validateMappedRow({ fullName: "Alex", hireDate: "2024-13-01" }, "member_employment")).toContain(
      "Hire date must be a valid date in YYYY-MM-DD format.",
    );
    expect(validateMappedRow({ fullName: "Alex", hireDate: "2024-01-15" }, "member_employment")).toEqual([]);
    expect(normalizeCanonicalValues({ duesSource: "Rapport employeur" })).toEqual({
      duesSource: "employer_report",
    });
    expect(validateMappedRow({ fullName: "Alex", duesSource: "payroll" }, "member_employment")).toContain(
      "Dues source must be employer_report, card_roster, or officer_note.",
    );
  });

  it("resolves as-of assertions and open multi-job intervals", () => {
    expect(isEffectiveOn("2024-01-01", "", "2024-06-01")).toBe(true);
    expect(isEffectiveOn("2024-01-01", "2024-03-01", "2024-06-01")).toBe(false);
    expect(isEffectiveOn("2024-07-01", "", "2024-06-01")).toBe(false);
    // End date is exclusive: still open on the day before effectiveTo.
    expect(isEffectiveOn("2024-01-01", "2024-06-01", "2024-05-31")).toBe(true);
    expect(isEffectiveOn("2024-01-01", "2024-06-01", "2024-06-01")).toBe(false);

    const profile = pickAssertionsAsOf([
      { fieldKey: "duesStanding", value: "good", effectiveFrom: "2024-01-01", effectiveTo: "2024-04-01", observedAt: "2024-01-02T00:00:00.000Z" },
      { fieldKey: "duesStanding", value: "arrears", effectiveFrom: "2024-04-01", effectiveTo: "", observedAt: "2024-04-02T00:00:00.000Z" },
      { fieldKey: "email", value: "old@example.test", effectiveFrom: "2023-01-01", effectiveTo: "", observedAt: "2023-01-02T00:00:00.000Z" },
      { fieldKey: "email", value: "new@example.test", effectiveFrom: "2024-05-01", effectiveTo: "", observedAt: "2024-05-02T00:00:00.000Z" },
    ], "2024-06-01");
    expect(profile).toEqual({ duesStanding: "arrears", email: "new@example.test" });

    // Prefer the later observation when two facts share the same field and window.
    expect(pickAssertionsAsOf([
      { fieldKey: "duesStanding", value: "good", effectiveFrom: "2024-01-01", effectiveTo: "", observedAt: "2024-01-01T00:00:00.000Z" },
      { fieldKey: "duesStanding", value: "exempt", effectiveFrom: "2024-01-01", effectiveTo: "", observedAt: "2024-02-01T00:00:00.000Z" },
    ], "2024-03-01")).toEqual({ duesStanding: "exempt" });

    const openJobs = filterEffectiveOn([
      { positionKey: "A", effectiveFrom: "2023-01-01", effectiveTo: "" },
      { positionKey: "B", effectiveFrom: "2024-01-01", effectiveTo: "2024-05-01" },
      { positionKey: "C", effectiveFrom: "2024-02-01", effectiveTo: "" },
    ], "2024-06-01");
    expect(openJobs.map((job) => job.positionKey)).toEqual(["A", "C"]);
  });
});
