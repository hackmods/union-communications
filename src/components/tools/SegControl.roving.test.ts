import { describe, expect, it } from "vitest";
import { shouldUseSegRovingTabIndex } from "@/components/tools/SegControl";

describe("shouldUseSegRovingTabIndex", () => {
  it("uses roving tabindex for short option lists (treatment radios)", () => {
    expect(shouldUseSegRovingTabIndex(3)).toBe(true);
    expect(shouldUseSegRovingTabIndex(6)).toBe(true);
  });

  it("keeps every option in Tab order for long font lists", () => {
    expect(shouldUseSegRovingTabIndex(7)).toBe(false);
    expect(shouldUseSegRovingTabIndex(24)).toBe(false);
  });

  it("honours an explicit override", () => {
    expect(shouldUseSegRovingTabIndex(24, false)).toBe(false);
    expect(shouldUseSegRovingTabIndex(24, true)).toBe(true);
    expect(shouldUseSegRovingTabIndex(3, false)).toBe(false);
  });
});
