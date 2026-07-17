import { describe, expect, it } from "vitest";
import { BRAND_COLORS } from "@/lib/constants/brand";
import { buildPwaIconSvg } from "@/lib/brand/unionops-mark-svg";
import {
  assertManifestInstallable,
  buildWebManifest,
} from "@/lib/pwa/manifest";
import {
  buildBrandKitManifest,
  normalizePwaThemeColor,
  parsePwaThemeCookie,
  pwaThemeCookieValue,
  PWA_THEME_COOKIE,
  setThemeColorMeta,
} from "@/lib/pwa/brand-chrome";

describe("normalizePwaThemeColor", () => {
  it("uppercases valid hex and rejects junk", () => {
    expect(normalizePwaThemeColor("#abCDef")).toBe("#ABCDEF");
    expect(normalizePwaThemeColor("nope")).toBe(BRAND_COLORS.primary);
    expect(normalizePwaThemeColor("#fff", "#112233")).toBe("#112233");
  });
});

describe("parsePwaThemeCookie", () => {
  it("reads a valid theme cookie", () => {
    expect(
      parsePwaThemeCookie(`${PWA_THEME_COOKIE}=%23003399; Path=/`),
    ).toBe("#003399");
  });

  it("ignores invalid or missing cookies", () => {
    expect(parsePwaThemeCookie(null)).toBeNull();
    expect(parsePwaThemeCookie("other=1")).toBeNull();
    expect(parsePwaThemeCookie(`${PWA_THEME_COOKIE}=red`)).toBeNull();
  });
});

describe("pwaThemeCookieValue", () => {
  it("writes a SameSite Lax cookie for the primary colour", () => {
    expect(pwaThemeCookieValue("#003399")).toContain(
      `${PWA_THEME_COOKIE}=${encodeURIComponent("#003399")}`,
    );
    expect(pwaThemeCookieValue("#003399")).toMatch(/SameSite=Lax/);
  });
});

describe("buildBrandKitManifest", () => {
  it("uses Brand Kit theme_color and stays installable", () => {
    const manifest = buildBrandKitManifest({
      primaryColor: "#003399",
      officerHubPublic: false,
    });
    expect(manifest.theme_color).toBe("#003399");
    expect(assertManifestInstallable(manifest)).toEqual([]);
  });
});

describe("setThemeColorMeta", () => {
  it("creates or updates the theme-color meta tag", () => {
    const doc = document.implementation.createHTMLDocument("t");
    setThemeColorMeta("#003399", doc);
    expect(
      doc.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
    ).toBe("#003399");
    setThemeColorMeta("#112233", doc);
    expect(doc.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
    expect(
      doc.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
    ).toBe("#112233");
  });
});

describe("buildPwaIconSvg", () => {
  it("paints the Brand Kit primary on the plate", () => {
    const svg = buildPwaIconSvg({ primary: "#003399" });
    expect(svg).toContain('fill="#003399"');
    expect(svg).toContain("viewBox=\"0 0 64 64\"");
  });
});

describe("host manifest still defaults to host brand", () => {
  it("keeps host theme when no override is passed", () => {
    const manifest = buildWebManifest({ officerHubPublic: false });
    expect(manifest.theme_color).toBe(BRAND_COLORS.primary);
  });
});
