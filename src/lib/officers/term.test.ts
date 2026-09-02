import { describe, expect, it } from "vitest";
import { filterExpiringSoon, isTermExpiringSoon } from "./term";

const now = new Date("2026-09-02T12:00:00.000Z");

describe("officer term expiring-soon", () => {
  it("treats missing or unparseable termEnd as not expiring", () => {
    expect(isTermExpiringSoon(undefined, 60, now)).toBe(false);
    expect(isTermExpiringSoon("not-a-date", 60, now)).toBe(false);
  });

  it("includes terms that end today, within the window, or already expired", () => {
    expect(isTermExpiringSoon("2026-09-02T12:00:00.000Z", 60, now)).toBe(true);
    expect(isTermExpiringSoon("2026-11-01T12:00:00.000Z", 60, now)).toBe(true);
    expect(isTermExpiringSoon("2026-08-31", 60, now)).toBe(true);
  });

  it("excludes terms that end after the horizon", () => {
    expect(isTermExpiringSoon("2026-11-02T12:00:01.000Z", 60, now)).toBe(false);
    expect(isTermExpiringSoon("2027-06-30", 60, now)).toBe(false);
  });

  it("filters a roster to entries whose termEnd is in the window", () => {
    const roster = [
      { id: "expired", termEnd: "2026-08-31" },
      { id: "open" },
      { id: "far", termEnd: "2028-01-01" },
      { id: "soon", termEnd: "2026-10-01" },
    ];
    expect(filterExpiringSoon(roster, 60, now).map((e) => e.id)).toEqual([
      "expired",
      "soon",
    ]);
  });
});
