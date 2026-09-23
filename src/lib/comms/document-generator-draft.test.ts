import { describe, expect, it } from "vitest";
import {
  mergeLetterSharedFields,
  resolveSalutationLine,
  topMarginTwips,
} from "./document-generator-draft";

describe("document-generator-draft", () => {
  it("keeps shared letter chrome when switching letter presets", () => {
    const merged = mergeLetterSharedFields(
      { contactName: "Default", body: "new" },
      { contactName: "Chief steward", salutation: "Dear team,", stewardName: "Alex" },
      "welcome-letter",
      "simple-letter",
    );
    expect(merged.contactName).toBe("Chief steward");
    expect(merged.salutation).toBe("Dear team,");
    expect(merged.stewardName).toBe("Alex");
    expect(merged.body).toBe("new");
  });

  it("resolves salutation presets", () => {
    expect(resolveSalutationLine({ memberName: "Sam" }, "dearMember")).toBe(
      "Dear Sam,",
    );
    expect(resolveSalutationLine({}, "dearNewMember")).toBe("Dear New Member!");
    expect(
      resolveSalutationLine({ salutation: "Hello friends" }, "custom"),
    ).toBe("Hello friends,");
  });

  it("maps top margin presets to twips", () => {
    expect(topMarginTwips("tight")).toBeLessThan(topMarginTwips("standard"));
    expect(topMarginTwips("roomy")).toBeGreaterThan(topMarginTwips("standard"));
  });
});
