import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  meetsWcagAA,
  checkContrast,
  hexToRgba,
} from "@/lib/utils/contrast";
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
