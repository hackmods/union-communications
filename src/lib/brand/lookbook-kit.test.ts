import { describe, expect, it } from "vitest";
import {
  brandKitFromTheme,
  chromeDiffersFromPrimary,
  lookbookScopeStyle,
} from "@/lib/brand/lookbook-kit";
import { resolveBrandChromeTokens } from "@/lib/brand/chrome-tokens";

describe("lookbookScopeStyle", () => {
  it("sets brand and chrome CSS variables from colours", () => {
    const style = lookbookScopeStyle({
      primaryColor: "#003DA5",
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
    });
    const chrome = resolveBrandChromeTokens("#003DA5", "#002868");
    expect(style["--brand-primary" as keyof typeof style]).toBe("#003DA5");
    expect(style["--brand-secondary" as keyof typeof style]).toBe("#FFFFFF");
    expect(style["--brand-accent" as keyof typeof style]).toBe("#002868");
    expect(style["--opseu-blue" as keyof typeof style]).toBe(chrome.interactive);
    expect(style["--opseu-dark" as keyof typeof style]).toBe(chrome.heading);
    expect(style["--color-opseu-blue" as keyof typeof style]).toBe(
      chrome.interactive,
    );
  });
});

describe("chromeDiffersFromPrimary", () => {
  it("detects when chrome darkens a light primary", () => {
    expect(chromeDiffersFromPrimary("#FFD700", "#002868")).toBe(true);
  });

  it("is false when interactive matches a dark primary", () => {
    expect(chromeDiffersFromPrimary("#003DA5", "#002868")).toBe(false);
  });
});

describe("brandKitFromTheme", () => {
  it("applies colours and canvas fonts onto a kit sample", () => {
    const kit = brandKitFromTheme({
      primaryColor: "#112233",
      secondaryColor: "#445566",
      accentColor: "#778899",
      headlineFontId: "oswald",
      bodyFontId: "sourceSans",
    });
    expect(kit.primaryColor).toBe("#112233");
    expect(kit.secondaryColor).toBe("#445566");
    expect(kit.accentColor).toBe("#778899");
    expect(kit.canvas?.headlineFontId).toBe("oswald");
    expect(kit.canvas?.bodyFontId).toBe("sourceSans");
  });
});
