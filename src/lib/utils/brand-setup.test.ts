import { describe, expect, it } from "vitest";
import { brandSetupHref } from "./brand-setup";

describe("brandSetupHref", () => {
  it("sends new locals to onboarding", () => {
    expect(brandSetupHref(false)).toBe("/onboarding");
  });

  it("sends established locals to Brand Kit", () => {
    expect(brandSetupHref(true)).toBe("/brand-kit");
  });
});
