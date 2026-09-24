import { describe, expect, it } from "vitest";
import {
  officeXlsxBrandBandStyle,
  officeXlsxHexArgb,
  officeXlsxInkArgbOn,
  resolveOfficeBrandFonts,
  withOfficeXlsxFont,
} from "./office-brand-styles";
import {
  canvasFontOfficeName,
  DEFAULT_BODY_FONT,
  DEFAULT_HEADLINE_FONT,
} from "@/lib/comms/canvas-fonts";
import { pickContrastingInk } from "@/lib/utils/ink";

describe("office-brand-styles", () => {
  it("defaults to Brand Kit catalog faces", () => {
    const fonts = resolveOfficeBrandFonts();
    expect(fonts.headlineFontId).toBe(DEFAULT_HEADLINE_FONT);
    expect(fonts.bodyFontId).toBe(DEFAULT_BODY_FONT);
    expect(fonts.headlineFont).toBe(canvasFontOfficeName(DEFAULT_HEADLINE_FONT));
    expect(fonts.bodyFont).toBe(canvasFontOfficeName(DEFAULT_BODY_FONT));
  });

  it("honours explicit ids and name overrides", () => {
    const fonts = resolveOfficeBrandFonts({
      headlineFontId: "oswald",
      bodyFontId: "lato",
      headlineFont: "Custom Head",
    });
    expect(fonts.headlineFontId).toBe("oswald");
    expect(fonts.bodyFontId).toBe("lato");
    expect(fonts.headlineFont).toBe("Custom Head");
    expect(fonts.bodyFont).toBe(canvasFontOfficeName("lato"));
  });

  it("withOfficeXlsxFont adds name when present", () => {
    expect(withOfficeXlsxFont({ bold: true }, "Oswald")).toEqual({
      bold: true,
      name: "Oswald",
    });
    expect(withOfficeXlsxFont({ bold: true }, null)).toEqual({ bold: true });
  });

  it("matches Word pickContrastingInk on brand orange and navy", () => {
    expect(officeXlsxInkArgbOn("#C2410C")).toBe(
      officeXlsxHexArgb(pickContrastingInk("#C2410C")),
    );
    expect(officeXlsxInkArgbOn("#C2410C")).toBe("FFFFFFFF");
    expect(officeXlsxInkArgbOn("#E87722")).toBe(
      officeXlsxHexArgb(pickContrastingInk("#E87722")),
    );
    expect(officeXlsxInkArgbOn("#003366")).toBe("FFFFFFFF");
    expect(officeXlsxInkArgbOn("#F4F1EA")).toBe(
      officeXlsxHexArgb(pickContrastingInk("#F4F1EA")),
    );
  });

  it("builds a brand band with fill, ink, and middle alignment", () => {
    const band = officeXlsxBrandBandStyle({
      background: "#C2410C",
      faceName: "Oswald",
      size: 14,
    });
    expect(band.fill.fgColor.argb).toBe("FFC2410C");
    expect(band.font.color).toEqual({ argb: "FFFFFFFF" });
    expect(band.font.name).toBe("Oswald");
    expect(band.alignment.vertical).toBe("middle");
  });
});
