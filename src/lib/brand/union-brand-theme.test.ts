import { describe, expect, it } from "vitest";
import {
  brandThemeToKitPatch,
  emptyThemeDraft,
  parseUnionBrandTheme,
} from "@/lib/brand/union-brand-theme";

describe("parseUnionBrandTheme", () => {
  it("normalizes valid colours and fonts", () => {
    expect(
      parseUnionBrandTheme({
        primaryColor: "#ce1126",
        secondaryColor: "#ffffff",
        accentColor: "#9b0d1c",
        headlineFontId: "oswald",
        bodyFontId: "sourceSans",
      }),
    ).toEqual({
      primaryColor: "#CE1126",
      secondaryColor: "#FFFFFF",
      accentColor: "#9B0D1C",
      headlineFontId: "oswald",
      bodyFontId: "sourceSans",
    });
  });

  it("rejects invalid hex or fonts", () => {
    expect(
      parseUnionBrandTheme({
        primaryColor: "#fff",
        secondaryColor: "#FFFFFF",
        accentColor: "#000000",
      }),
    ).toBeNull();
    expect(
      parseUnionBrandTheme({
        primaryColor: "#112233",
        secondaryColor: "#445566",
        accentColor: "#778899",
        headlineFontId: "comic-sans",
      }),
    ).toBeNull();
  });
});

describe("brandThemeToKitPatch", () => {
  it("maps colours and optional canvas fonts", () => {
    expect(
      brandThemeToKitPatch({
        primaryColor: "#112233",
        secondaryColor: "#445566",
        accentColor: "#778899",
        headlineFontId: "montserrat",
      }),
    ).toEqual({
      primaryColor: "#112233",
      secondaryColor: "#445566",
      accentColor: "#778899",
      canvas: { headlineFontId: "montserrat" },
    });
  });
});

describe("emptyThemeDraft", () => {
  it("fills default fonts", () => {
    const draft = emptyThemeDraft({
      primaryColor: "#003DA5",
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
    });
    expect(draft.headlineFontId).toBe("montserrat");
    expect(draft.bodyFontId).toBe("sourceSans");
    expect(draft.primaryColor).toBe("#003DA5");
  });
});
