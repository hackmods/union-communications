import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { measureBrandKitCompleteness } from "./brand-kit-completeness";

describe("measureBrandKitCompleteness", () => {
  it("scores an empty-ish default kit below 100%", () => {
    const result = measureBrandKitCompleteness({
      ...DEFAULT_BRAND_KIT,
      local: { ...DEFAULT_BRAND_KIT.local, localNumber: "" },
      useOfficialLogo: false,
      customLogoDataUrl: undefined,
      logoText: undefined,
      websiteUrl: undefined,
      facebookUrl: undefined,
      customLinks: [],
      membershipUrls: [],
      canvas: undefined,
      signatureName: undefined,
    });
    expect(result.percent).toBeLessThan(100);
    expect(result.missing).toContain("localNumber");
    expect(result.missing).toContain("signature");
  });

  it("reaches 100% when identity, links, canvas, and signature are set", () => {
    const result = measureBrandKitCompleteness({
      ...DEFAULT_BRAND_KIT,
      local: { ...DEFAULT_BRAND_KIT.local, localNumber: "243" },
      useOfficialLogo: true,
      websiteUrl: "https://example.org",
      canvas: { typeScale: "compact" },
      signatureName: "Alex Steward",
    });
    expect(result.percent).toBe(100);
    expect(result.missing).toEqual([]);
  });
});
