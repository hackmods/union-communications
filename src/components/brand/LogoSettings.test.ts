import { describe, expect, it } from "vitest";
import {
  brandKitPatchForLogoMode,
  resolveLogoMode,
  resolveSelectableLogoMode,
} from "./LogoSettings";
import { UNIONOPS_LOGOS, resolvePresetLogos } from "@/lib/constants/unionPresets";

const cupeLogos = resolvePresetLogos({
  lockup: "/assets/unions/cupe/logo.svg",
  mark: "/assets/unions/cupe/logo-mark.svg",
});

const opseuLogos = resolvePresetLogos({
  useOfficialPack: true,
  lockup: "/assets/caat-opseu/logo-primary.png",
  mark: "/assets/caat-opseu/logo-mark.png",
});

describe("resolveLogoMode", () => {
  it("returns official variant when useOfficialLogo is true for OPSEU pack", () => {
    expect(resolveLogoMode(true, "mark", undefined, opseuLogos)).toBe("mark");
    expect(resolveLogoMode(true, undefined, undefined, opseuLogos)).toBe(
      "lockup",
    );
  });

  it("returns custom when a data URL is present", () => {
    expect(
      resolveLogoMode(false, "lockup", "data:image/png;base64,abc", cupeLogos),
    ).toBe("custom");
  });

  it("returns custom when custom mode is selected but no file uploaded yet", () => {
    expect(resolveLogoMode(false, "lockup", "", cupeLogos)).toBe("custom");
  });

  it("returns platform when neither official nor custom is selected", () => {
    expect(resolveLogoMode(false, "lockup", undefined, cupeLogos)).toBe(
      "platform",
    );
  });

  it("returns platform for UnionOps mark paths", () => {
    expect(
      resolveLogoMode(false, "lockup", UNIONOPS_LOGOS.mark, cupeLogos),
    ).toBe("platform");
  });

  it("returns union modes for bundled starter paths", () => {
    expect(
      resolveLogoMode(false, "lockup", cupeLogos.lockup, cupeLogos),
    ).toBe("union-lockup");
    expect(resolveLogoMode(false, "lockup", cupeLogos.mark, cupeLogos)).toBe(
      "union-mark",
    );
  });
});

describe("resolveSelectableLogoMode", () => {
  it("keeps custom pending upload selectable", () => {
    expect(resolveSelectableLogoMode(false, "lockup", "", cupeLogos)).toBe(
      "custom",
    );
  });

  it("does not leave OPSEU lockup selected for non-OPSEU presets", () => {
    expect(
      resolveSelectableLogoMode(true, "lockup", undefined, cupeLogos),
    ).toBe("platform");
  });

  it("keeps custom selectable when preset has no attached logos", () => {
    const otherLogos = resolvePresetLogos(undefined);
    expect(resolveSelectableLogoMode(false, "lockup", "", otherLogos)).toBe(
      "custom",
    );
    expect(
      resolveSelectableLogoMode(
        false,
        "lockup",
        "data:image/png;base64,abc",
        otherLogos,
      ),
    ).toBe("custom");
  });

  it("does not treat UnionOps fallback paths as union modes", () => {
    const otherLogos = resolvePresetLogos(undefined);
    expect(
      resolveLogoMode(false, "lockup", UNIONOPS_LOGOS.lockup, otherLogos),
    ).toBe("platform");
    expect(
      resolveLogoMode(false, "lockup", UNIONOPS_LOGOS.mark, otherLogos),
    ).toBe("platform");
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

  it("selecting none falls back to the UnionOps mark", () => {
    expect(brandKitPatchForLogoMode("none", "243")).toEqual({
      useOfficialLogo: false,
      customLogoDataUrl: UNIONOPS_LOGOS.mark,
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

  it("selecting union lockup uses the bundled path", () => {
    expect(
      brandKitPatchForLogoMode("union-lockup", "CUPE", undefined, cupeLogos),
    ).toEqual({
      useOfficialLogo: false,
      customLogoDataUrl: cupeLogos.lockup,
    });
  });

  it("selecting platform uses the UnionOps mark", () => {
    expect(brandKitPatchForLogoMode("platform")).toEqual({
      useOfficialLogo: false,
      customLogoDataUrl: UNIONOPS_LOGOS.mark,
    });
  });
});
