import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const EXPECTED_HEADER =
  "Department, Shift, Name, Job Title, Organic Leader? (Y/N), Union Support Score (1-5), Issues/Notes, Assigned Steward";

describe("workplace map CSV template", () => {
  it("ships with the steward-facing header row", () => {
    const csv = readFileSync(
      path.resolve("public/templates/unionops-workplace-map.csv"),
      "utf8",
    );
    const header = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/)[0];
    expect(header).toBe(EXPECTED_HEADER);
  });
});
