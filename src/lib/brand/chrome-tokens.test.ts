import { describe, expect, it } from "vitest";
import {
  BRAND_CHROME_RUNTIME_JS,
  ensureHeadingOnPaper,
  ensureWhiteLabelFill,
  resolveBrandChromeTokens,
  whiteInkMeetsLargeText,
} from "./chrome-tokens";
import { meetsWcagAA } from "@/lib/utils/contrast";
import { pickContrastingInk, INK_WHITE } from "@/lib/utils/ink";

describe("chrome-tokens", () => {
  it("keeps OPSEU accent as heading ink", () => {
    const chrome = resolveBrandChromeTokens("#003DA5", "#002868");
    expect(chrome.heading).toBe("#002868");
    expect(chrome.interactive).toBe("#003DA5");
    expect(meetsWcagAA(chrome.heading, "#FFFFFF")).toBe(true);
    expect(meetsWcagAA("#FFFFFF", chrome.interactive)).toBe(true);
  });

  it("does not use CAAT-S gold as heading ink on white UI", () => {
    const chrome = resolveBrandChromeTokens("#EA5A4F", "#FFB837");
    expect(chrome.heading.toUpperCase()).not.toBe("#FFB837");
    expect(meetsWcagAA(chrome.heading, "#FFFFFF")).toBe(true);
    expect(meetsWcagAA("#FFFFFF", chrome.interactive)).toBe(true);
    // Interactive fill may darken coral so white button labels pass AA
    expect(chrome.interactive.toUpperCase()).not.toBe("#EA5A4F");
  });

  it("matches the FOUC runtime helper for CAAT-S and OPSEU", () => {
    const run = new Function(
      `${BRAND_CHROME_RUNTIME_JS}; return uoChrome;`,
    )() as (
      primary: string,
      accent: string,
    ) => { interactive: string; heading: string };

    for (const pair of [
      ["#003DA5", "#002868"],
      ["#EA5A4F", "#FFB837"],
      ["#C2410C", "#9A3412"],
    ] as const) {
      const ts = resolveBrandChromeTokens(pair[0], pair[1]);
      const js = run(pair[0], pair[1]);
      expect(js.interactive).toBe(ts.interactive);
      expect(js.heading).toBe(ts.heading);
    }
  });

  it("exposes helpers used by canvas ink preference", () => {
    expect(whiteInkMeetsLargeText("#EA5A4F")).toBe(true);
    expect(whiteInkMeetsLargeText("#FFB837")).toBe(false);
    expect(ensureWhiteLabelFill("#003DA5")).toBe("#003DA5");
    expect(ensureHeadingOnPaper("#002868", "#003DA5")).toBe("#002868");
  });
});

describe("pickContrastingInk canvas preference", () => {
  it("prefers white on CAAT-S coral (large-text AA)", () => {
    expect(pickContrastingInk("#EA5A4F")).toBe(INK_WHITE);
  });
});
