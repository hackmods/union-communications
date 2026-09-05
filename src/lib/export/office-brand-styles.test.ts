import { describe, expect, it } from "vitest";
import {
  resolveOfficeBrandFonts,
  withOfficeXlsxFont,
} from "./office-brand-styles";
import {
  canvasFontOfficeName,
  DEFAULT_BODY_FONT,
  DEFAULT_HEADLINE_FONT,
} from "@/lib/comms/canvas-fonts";

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
});
