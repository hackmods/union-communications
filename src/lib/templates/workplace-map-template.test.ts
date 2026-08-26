import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const EXPECTED_HEADER =
  "Department, Shift, Name, Job Title, Organic Leader? (Y/N), Union Support Score (1-5), Issues/Notes, Assigned Steward";

function readCsv(filename: string): string {
  return readFileSync(path.resolve("public/templates", filename), "utf8");
}

function headerAndRows(csv: string): { header: string; rows: string[] } {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
  return { header: lines[0] ?? "", rows: lines.slice(1) };
}

describe("workplace map CSV template", () => {
  it("ships with the steward-facing header row", () => {
    const { header, rows } = headerAndRows(readCsv("unionops-workplace-map.csv"));
    expect(header).toBe(EXPECTED_HEADER);
    expect(rows).toHaveLength(0);
  });

  it("ships a fictional example chart with the same header and teaching rows", () => {
    const { header, rows } = headerAndRows(
      readCsv("unionops-workplace-map-example.csv"),
    );
    expect(header).toBe(EXPECTED_HEADER);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((row) => row.includes("Priya N."))).toBe(true);
    expect(rows.some((row) => row.includes("Morgan D."))).toBe(true);
  });
});
