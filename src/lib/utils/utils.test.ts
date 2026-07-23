import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  meetsWcagAA,
  checkContrast,
  hexToRgba,
} from "@/lib/utils/contrast";
import {
  coloursClash,
  brandPaletteHasContrastRisk,
  evaluateBrandPaletteContrast,
  inkWithAlpha,
  isLightInk,
  logoRasterFilter,
  pickContrastingInk,
  INK_BLACK,
  INK_WHITE,
} from "@/lib/utils/ink";
import { validateImageFile } from "@/lib/utils/validation";
import { formatFilename, slugify, resolveLocalNumber } from "@/lib/utils";

describe("contrast utilities", () => {
  it("calculates contrast ratio between black and white", () => {
    const ratio = contrastRatio("#000000", "#FFFFFF");
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("checks WCAG AA for OPSEU blue on white", () => {
    expect(meetsWcagAA("#003DA5", "#FFFFFF")).toBe(true);
  });

  it("returns contrast result object", () => {
    const result = checkContrast("#003DA5", "#FFFFFF");
    expect(result.passesAA).toBe(true);
    expect(result.ratio).toBeGreaterThan(4.5);
  });

  it("converts hex to rgba for gradients", () => {
    expect(hexToRgba("#003DA5", 0.7)).toBe("rgba(0, 61, 165, 0.7)");
    expect(hexToRgba("bad", 0.5)).toBeNull();
  });
});

describe("ink utilities", () => {
  it("picks white ink on OPSEU blue", () => {
    expect(pickContrastingInk("#003DA5")).toBe(INK_WHITE);
    expect(isLightInk(pickContrastingInk("#003DA5"))).toBe(true);
  });

  it("picks black ink on cream / near-white primary", () => {
    expect(pickContrastingInk("#F5F0E8")).toBe(INK_BLACK);
    expect(pickContrastingInk("#FFFFFF")).toBe(INK_BLACK);
  });

  it("picks white ink on near-black", () => {
    expect(pickContrastingInk("#1A1A1A")).toBe(INK_WHITE);
    expect(pickContrastingInk("#000000")).toBe(INK_WHITE);
  });

  it("prefers white on mid-grey ties", () => {
    // #777777 is roughly equidistant; white wins on ties
    expect(pickContrastingInk("#777777")).toBe(INK_WHITE);
  });

  it("returns export-safe rgba for ink alphas", () => {
    expect(inkWithAlpha(INK_WHITE, 0.9)).toBe("rgba(255, 255, 255, 0.9)");
    expect(inkWithAlpha(INK_BLACK, 0.7)).toBe("rgba(26, 26, 26, 0.7)");
  });

  it("returns CSS filters for monochrome logos", () => {
    expect(logoRasterFilter(INK_WHITE)).toBe("brightness(0) invert(1)");
    expect(logoRasterFilter(INK_BLACK)).toBe("brightness(0)");
  });

  it("detects logo/background colour clash", () => {
    expect(coloursClash("#003DA5", "#003DA5")).toBe(true);
    expect(coloursClash("#003DA5", "#FFFFFF")).toBe(false);
  });

  it("flags Brand Kit palettes when primary and secondary clash", () => {
    expect(
      brandPaletteHasContrastRisk({
        primary: "#003DA5",
        secondary: "#003DA5",
      }),
    ).toBe(true);
    expect(
      evaluateBrandPaletteContrast({
        primary: "#003DA5",
        secondary: "#003DA5",
      }).issues,
    ).toContain("primarySecondaryClash");
  });

  it("accepts a strong Brand Kit primary/secondary pair", () => {
    expect(
      brandPaletteHasContrastRisk({
        primary: "#003DA5",
        secondary: "#FFFFFF",
        accent: "#9B0D1C",
      }),
    ).toBe(false);
  });

  it("flags mid-grey canvases where auto ink fails WCAG AA", () => {
    // #777777: pickContrastingInk prefers white, but white fails AA on this grey
    const result = evaluateBrandPaletteContrast({
      primary: "#777777",
      secondary: "#FFFFFF",
    });
    expect(result.ok).toBe(false);
    expect(result.issues).toContain("primaryCanvasInk");
  });
});

describe("validation utilities", () => {
  it("rejects invalid file types", () => {
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
  });

  it("accepts valid PNG files", () => {
    const file = new File(["test"], "test.png", { type: "image/png" });
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
  });
});

describe("format utilities", () => {
  it("slugifies text", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });

  it("formats filenames with local number", () => {
    expect(formatFilename("logo", "110", "png")).toBe("logo-local-110.png");
  });

  it("defaults empty local number to 243", () => {
    expect(resolveLocalNumber("")).toBe("243");
    expect(resolveLocalNumber("  ")).toBe("243");
    expect(resolveLocalNumber("110")).toBe("110");
  });

  it("formats filenames with 243 fallback", () => {
    expect(formatFilename("logo", "", "png")).toBe("logo-local-243.png");
  });
});
