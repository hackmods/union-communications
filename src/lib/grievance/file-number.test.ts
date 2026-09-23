import { describe, expect, it } from "vitest";
import {
  formatGrievanceFileNumber,
  nextGrievanceFileNumber,
  parseGrievanceFileNumber,
} from "@/lib/grievance/file-number";

describe("grievance file numbers", () => {
  it("formats padded sequences", () => {
    expect(formatGrievanceFileNumber(2026, 1)).toBe("GRV-2026-0001");
    expect(formatGrievanceFileNumber(2026, 42)).toBe("GRV-2026-0042");
  });

  it("parses valid file numbers", () => {
    expect(parseGrievanceFileNumber("GRV-2026-0007")).toEqual({
      year: 2026,
      sequence: 7,
    });
    expect(parseGrievanceFileNumber("nope")).toBeNull();
  });

  it("increments within the year and ignores other years", () => {
    expect(
      nextGrievanceFileNumber(["GRV-2025-0099", "GRV-2026-0003", undefined], 2026),
    ).toBe("GRV-2026-0004");
    expect(nextGrievanceFileNumber([], 2026)).toBe("GRV-2026-0001");
  });
});
