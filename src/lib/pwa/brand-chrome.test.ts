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
  replaceDocumentFavicons,
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

describe("replaceDocumentFavicons", () => {
  it("prepends owned brand icons without deleting Next/static links", () => {
    const doc = document.implementation.createHTMLDocument("t");
    const staleSvg = doc.createElement("link");
    staleSvg.rel = "icon";
    staleSvg.type = "image/svg+xml";
    staleSvg.href = "/favicon.svg";
    doc.head.appendChild(staleSvg);
    const staleIco = doc.createElement("link");
    staleIco.rel = "icon";
    staleIco.href = "/favicon.ico";
    doc.head.appendChild(staleIco);
    const shortcut = doc.createElement("link");
    shortcut.rel = "shortcut icon";
    shortcut.href = "/favicon.ico";
    doc.head.appendChild(shortcut);
    const keep = doc.createElement("link");
    keep.rel = "manifest";
    keep.href = "/manifest.webmanifest";
    doc.head.appendChild(keep);

    replaceDocumentFavicons(
      [
        { href: "blob:brand-svg", type: "image/svg+xml", sizes: "any" },
        { href: "blob:brand-png", type: "image/png", sizes: "32x32" },
      ],
      doc,
    );

    const icons = [...doc.querySelectorAll('link[rel="icon"]')];
    expect(icons).toHaveLength(4);
    expect(icons[0]?.getAttribute("href")).toBe("blob:brand-svg");
    expect(icons[0]?.getAttribute("type")).toBe("image/svg+xml");
    expect(icons[0]?.getAttribute("data-uo-brand-chrome")).toBe("icon");
    expect(icons[1]?.getAttribute("href")).toBe("blob:brand-png");
    expect(icons[1]?.getAttribute("sizes")).toBe("32x32");
    expect(doc.querySelector('link[rel="shortcut icon"]')).not.toBeNull();
    expect(
      doc.querySelector('link[rel="manifest"]')?.getAttribute("href"),
    ).toBe("/manifest.webmanifest");

    replaceDocumentFavicons(
      [{ href: "blob:brand-svg-2", type: "image/svg+xml", sizes: "any" }],
      doc,
    );
    const after = [...doc.querySelectorAll('link[rel="icon"]')];
    expect(after.filter((el) => el.hasAttribute("data-uo-brand-chrome"))).toHaveLength(
      1,
    );
    expect(after.some((el) => el.getAttribute("href") === "/favicon.svg")).toBe(
      true,
    );
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
