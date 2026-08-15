import { describe, expect, it } from "vitest";
import {
  CANVAS_FONT_ORDER,
  canvasFontFamily,
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
});
