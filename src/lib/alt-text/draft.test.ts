import { describe, it, expect } from "vitest";
import {
  PLATFORM_ALT_LIMITS,
  analyzeAltText,
  countAltChars,
  exceedsLimit,
  strictestPlatformLimit,
} from "@/lib/alt-text/draft";

describe("alt-text draft helpers", () => {
  it("counts characters and detects platform overflows", () => {
    expect(countAltChars("hello")).toBe(5);
    expect(exceedsLimit("a".repeat(1001), PLATFORM_ALT_LIMITS.instagram)).toBe(
      true,
    );
    expect(exceedsLimit("a".repeat(1000), PLATFORM_ALT_LIMITS.instagram)).toBe(
      false,
    );
    expect(strictestPlatformLimit()).toBe(1000);
  });

  it("flags empty drafts", () => {
    expect(analyzeAltText("   ").issues).toEqual(["empty"]);
    expect(analyzeAltText("").ok).toBe(false);
  });

  it("flags English and French 'image of' openings", () => {
    expect(analyzeAltText("Photo of a rally").issues).toContain(
      "startsWithImageOf",
    );
    expect(analyzeAltText("Image d'un rassemblement syndical").issues).toContain(
      "startsWithImageOf",
    );
  });

  it("flags leftover placeholders and caption duplicates", () => {
    expect(
      analyzeAltText(
        "[Image description: Describe the visual content here - who is pictured.]",
      ).issues,
    ).toContain("placeholderLeft");

    expect(
      analyzeAltText("Join us Thursday at 5pm for the membership meeting.", {
        caption: "Join us Thursday at 5pm for the membership meeting.",
      }).issues,
    ).toContain("sameAsCaption");
  });

  it("accepts a solid draft", () => {
    const result = analyzeAltText(
      "Blue graphic: Local 243 membership meeting Thursday 5pm in Room 204. Union logo top left, date and location in white text.",
    );
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
