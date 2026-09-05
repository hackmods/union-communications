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
      opseuSectorId: "caat-support",
      identityPackId: "opseu-caat-s",
      useOfficialLogo: true,
      officialLogoVariant: "lockup",
      primaryColor: "#EA5A4F",
    };
    const { src, cssFilter } = resolveBrandLogoPresentation(kit, "#EA5A4F");
    expect(src).toContain("knockout");
    expect(cssFilter).toBeUndefined();
  });

  it("uses the CAAT-S gold-plate lockup on gold primary without CSS filter", () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "opseu",
      opseuSectorId: "caat-support",
      identityPackId: "opseu-caat-s",
      campaignPlate: "gold",
      useOfficialLogo: true,
      officialLogoVariant: "lockup",
      primaryColor: "#FFB837",
      accentColor: "#EA5A4F",
    };
    const { src, cssFilter } = resolveBrandLogoPresentation(kit, "#FFB837");
    expect(src).toContain("on-gold");
    expect(cssFilter).toBeUndefined();
  });

  it("uses the gold-plate lockup on a gold secondary band while coral campaign is active", () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "opseu",
      opseuSectorId: "caat-support",
      identityPackId: "opseu-caat-s",
      campaignPlate: "coral",
      useOfficialLogo: true,
      officialLogoVariant: "lockup",
      primaryColor: "#EA5A4F",
      secondaryColor: "#FFFFFF",
      accentColor: "#FFB837",
    };
    // Meeting Background bands: logo sits on secondary/accent gold, not coral primary.
    const { src, cssFilter } = resolveBrandLogoPresentation(kit, "#FFB837");
    expect(src).toContain("on-gold");
    expect(cssFilter).toBeUndefined();
  });

  it("keeps the coral knockout on coral fills when gold campaign is active", () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "opseu",
      opseuSectorId: "caat-support",
      identityPackId: "opseu-caat-s",
      campaignPlate: "gold",
      useOfficialLogo: true,
      officialLogoVariant: "lockup",
      primaryColor: "#FFB837",
      secondaryColor: "#FFFFFF",
      accentColor: "#EA5A4F",
    };
    const { src, cssFilter } = resolveBrandLogoPresentation(kit, "#EA5A4F");
    expect(src).toContain("knockout");
    expect(cssFilter).toBeUndefined();
  });

  it("uses CAAT-A mark on white nav without CSS filter", () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "opseu",
      opseuSectorId: "caat-academic",
      identityPackId: "opseu-caat-a",
      useOfficialLogo: true,
      officialLogoVariant: "mark",
      primaryColor: "#B22E2C",
    };
    const { src, cssFilter } = resolveBrandLogoPresentation(kit);
    expect(src).toContain("logo-mark.png");
    expect(cssFilter).toBeUndefined();
  });

  it("puts a paper plate behind custom uploads on brand fills (keeps full colour)", () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      useOfficialLogo: false,
      customLogoDataUrl: "data:image/png;base64,customlogo",
      primaryColor: "#EA5A4F",
      secondaryColor: "#FFB837",
      accentColor: "#EA5A4F",
    };
    const onGold = resolveBrandLogoPresentation(kit, "#FFB837");
    expect(onGold.src).toBe("data:image/png;base64,customlogo");
    expect(onGold.cssFilter).toBeUndefined();
    expect(onGold.plate?.backgroundColor).toBe("#FFFFFF");

    const onPaper = resolveBrandLogoPresentation(kit, "#FFFFFF");
    expect(onPaper.plate).toBeUndefined();
    expect(onPaper.cssFilter).toBeUndefined();
  });
});
