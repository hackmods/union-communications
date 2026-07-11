import { describe, expect, it } from "vitest";
import {
  brandKitPatchForLogoMode,
  resolveLogoMode,
  resolveSelectableLogoMode,
} from "./LogoSettings";

describe("resolveLogoMode", () => {
  it("returns official variant when useOfficialLogo is true", () => {
    expect(resolveLogoMode(true, "mark")).toBe("mark");
    expect(resolveLogoMode(true, undefined)).toBe("lockup");
  });

  it("returns custom when a data URL is present", () => {
    expect(
      resolveLogoMode(false, "lockup", "data:image/png;base64,abc"),
    ).toBe("custom");
  });

  it("returns custom when custom mode is selected but no file uploaded yet", () => {
    expect(resolveLogoMode(false, "lockup", "")).toBe("custom");
  });

  it("returns none when neither official nor custom is selected", () => {
    expect(resolveLogoMode(false, "lockup", undefined)).toBe("none");
  });
});

describe("resolveSelectableLogoMode", () => {
  it("keeps custom pending upload selectable", () => {
    expect(resolveSelectableLogoMode(false, "lockup", "")).toBe("custom");
  });
});

describe("brandKitPatchForLogoMode", () => {
  it("selecting custom preserves pending upload state so the picker stays open", () => {
    expect(brandKitPatchForLogoMode("custom")).toEqual({
      useOfficialLogo: false,
      customLogoDataUrl: "",
    });
  });

  it("selecting custom keeps an existing upload", () => {
    expect(
      brandKitPatchForLogoMode("custom", "LU", "data:image/png;base64,abc"),
    ).toEqual({
      useOfficialLogo: false,
      customLogoDataUrl: "data:image/png;base64,abc",
    });
  });

  it("selecting none clears custom logo", () => {
    expect(brandKitPatchForLogoMode("none", "243")).toEqual({
      useOfficialLogo: false,
      customLogoDataUrl: undefined,
      logoText: "243",
    });
  });

  it("selecting official clears custom logo", () => {
    expect(brandKitPatchForLogoMode("lockup")).toEqual({
      useOfficialLogo: true,
      officialLogoVariant: "lockup",
      customLogoDataUrl: undefined,
    });
  });
});
