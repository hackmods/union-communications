import { describe, expect, it } from "vitest";
import { toCsv } from "./reports";

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
});
