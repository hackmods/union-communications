import { describe, expect, it } from "vitest";
import { resolveBrandLogoPresentation } from "@/lib/brand/resolve-logo-presentation";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import type { BrandKit } from "@/types/entities";

describe("resolveBrandLogoPresentation", () => {
  it("uses white mark on dark primary without CSS filter", () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      useOfficialLogo: true,
      officialLogoVariant: "mark",
    };
    const { src, cssFilter } = resolveBrandLogoPresentation(kit, "#003DA5");
    expect(src).toContain("logo-mark-white");
    expect(cssFilter).toBeUndefined();
  });

  it("inverts lockup on dark primary for Office headers", () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      useOfficialLogo: true,
      officialLogoVariant: "lockup",
    };
    const { src, cssFilter } = resolveBrandLogoPresentation(kit, "#003DA5");
    expect(src).toContain("logo-primary");
    expect(cssFilter).toBe("brightness(0) invert(1)");
  });

  it("leaves lockup unfiltered when no background is given", () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      useOfficialLogo: true,
      officialLogoVariant: "lockup",
    };
    const { cssFilter } = resolveBrandLogoPresentation(kit);
    expect(cssFilter).toBeUndefined();
  });

  it("uses CAAT-S reverse lockup on coral primary without CSS filter", () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "opseu",
      identityPackId: "opseu-caat-s",
      useOfficialLogo: true,
      officialLogoVariant: "lockup",
      primaryColor: "#EA5A4E",
    };
    const { src, cssFilter } = resolveBrandLogoPresentation(kit, "#EA5A4E");
    expect(src).toContain("logo-lockup-reverse");
    expect(cssFilter).toBeUndefined();
  });
});
