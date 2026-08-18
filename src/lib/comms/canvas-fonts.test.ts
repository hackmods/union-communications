import { describe, expect, it } from "vitest";
import {
  CANVAS_BODY_FONT_ORDER,
  CANVAS_FONT_ORDER,
  canvasBodyFontChoices,
  canvasBodyFontWeight,
  canvasBodySizeFactor,
  canvasFontCssFamily,
  canvasFontFamily,
  canvasFontOfficeName,
  collectWebsiteZipFontFiles,
  DEFAULT_BODY_FONT,
  DEFAULT_FLYER_FONT,
  DEFAULT_HEADLINE_FONT,
  isCanvasFontId,
  isFlyerFontChoice,
  migrateCanvasFontId,
  migrateFlyerFontChoice,
  resolveFlyerFontFamily,
} from "@/lib/comms/canvas-fonts";

describe("canvas-fonts", () => {
  it("defaults to Montserrat + Source Sans", () => {
    expect(DEFAULT_HEADLINE_FONT).toBe("montserrat");
    expect(DEFAULT_BODY_FONT).toBe("sourceSans");
    expect(DEFAULT_FLYER_FONT).toBe("inherit");
  });

  it("exposes curated catalog of eight faces", () => {
    expect(CANVAS_FONT_ORDER).toHaveLength(8);
    for (const id of CANVAS_FONT_ORDER) {
      expect(isCanvasFontId(id)).toBe(true);
      expect(canvasFontFamily(id).length).toBeGreaterThan(0);
    }
  });

  it("webfont families use CSS variables; system faces use stacks", () => {
    expect(canvasFontFamily("montserrat")).toContain("var(--font-montserrat)");
    expect(canvasFontFamily("systemSans")).toContain("system-ui");
    expect(canvasFontFamily("systemSerif")).toContain("Georgia");
  });

  it("migrates legacy Flyer stack ids", () => {
    expect(migrateFlyerFontChoice("impact")).toBe("oswald");
    expect(migrateFlyerFontChoice("condensed")).toBe("barlowCondensed");
    expect(migrateFlyerFontChoice("clean")).toBe("inherit");
    expect(migrateFlyerFontChoice("slab")).toBe("robotoSlab");
    expect(migrateFlyerFontChoice("serif")).toBe("sourceSerif");
    expect(migrateCanvasFontId("impact")).toBe("oswald");
    expect(migrateCanvasFontId("clean")).toBeUndefined();
  });

  it("resolves Flyer inherit to Brand Kit headline family", () => {
    const brand = canvasFontFamily("montserrat");
    expect(resolveFlyerFontFamily("inherit", brand)).toBe(brand);
    expect(resolveFlyerFontFamily("oswald", brand)).toBe(
      canvasFontFamily("oswald"),
    );
  });

  it("validates Flyer choices", () => {
    expect(isFlyerFontChoice("inherit")).toBe(true);
    expect(isFlyerFontChoice("montserrat")).toBe(true);
    expect(isFlyerFontChoice("comic")).toBe(false);
  });

  it("exposes CSS family names and Office face names", () => {
    expect(canvasFontCssFamily("montserrat")).toContain("Montserrat");
    expect(canvasFontCssFamily("montserrat")).not.toContain("var(--");
    expect(canvasFontCssFamily("systemSans")).toContain("system-ui");
    expect(canvasFontOfficeName("oswald")).toBe("Oswald");
    expect(canvasFontOfficeName("sourceSans")).toBe("Source Sans 3");
    expect(canvasFontOfficeName("systemSans")).toBe("Arial");
    expect(canvasFontOfficeName("systemSerif")).toBe("Georgia");
  });

  it("collects deduped ZIP font subsets for headline + body", () => {
    const files = collectWebsiteZipFontFiles("oswald", "sourceSans");
    expect(files.some((f) => f.family === "Oswald")).toBe(true);
    expect(files.some((f) => f.family === "Source Sans 3")).toBe(true);
    expect(
      files.some(
        (f) => f.family === "Source Sans 3" && f.weight === 700,
      ),
    ).toBe(true);
    expect(files.every((f) => f.relativePath.endsWith(".woff2"))).toBe(true);
    expect(collectWebsiteZipFontFiles("systemSans", "systemSerif")).toEqual([]);
  });

  it("keeps condensed and display faces off the default body picker", () => {
    expect(CANVAS_BODY_FONT_ORDER).toContain("sourceSans");
    expect(CANVAS_BODY_FONT_ORDER).not.toContain("oswald");
    expect(CANVAS_BODY_FONT_ORDER).not.toContain("barlowCondensed");
    expect(canvasBodyFontChoices("sourceSans")).toEqual([...CANVAS_BODY_FONT_ORDER]);
    expect(canvasBodyFontChoices("oswald")[0]).toBe("oswald");
  });

  it("uses a real loaded weight and larger optical size for condensed body", () => {
    expect(canvasBodyFontWeight("sourceSans")).toBe(400);
    expect(canvasBodyFontWeight("oswald")).toBe(600);
    expect(canvasBodySizeFactor("barlowCondensed")).toBeGreaterThan(
      canvasBodySizeFactor("sourceSans"),
    );
  });
});
