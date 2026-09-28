import { describe, expect, it } from "vitest";
import { CURATED_REPORT_VIEWS, toCsv } from "./reports";
import { normalizeAsOf } from "./as-of";

describe("UnionOps Data report CSV", () => {
  it("formula-safes leading formula characters", () => {
    const csv = toCsv(["name", "note"], [
      { name: "Alex", note: "=1+1" },
      { name: "+Bonus", note: "@cmd" },
      { name: "-Lead", note: "plain" },
    ]);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+Bonus");
    expect(csv).toContain("'-Lead");
    expect(csv).toContain("'@cmd");
    expect(csv).toContain("plain");
  });

  it("quotes commas and newlines in CSV cells", () => {
    const csv = toCsv(["name", "note"], [{ name: "Alex, Jr.", note: "line one\nline two" }]);
    expect(csv).toContain('"Alex, Jr."');
    expect(csv).toContain('"line one\nline two"');
  });

  it("exposes the curated views officers can run", () => {
    expect(CURATED_REPORT_VIEWS).toEqual([
      "people_as_of",
      "assignments_as_of",
      "dues_standing_snapshot",
    ]);
    expect(normalizeAsOf("2024-06-15")).toBe("2024-06-15");
    expect(normalizeAsOf("not-a-date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
