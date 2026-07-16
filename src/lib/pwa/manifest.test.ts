import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertManifestInstallable,
  buildWebManifest,
  pwaStartUrl,
  PWA_INSTALLABLE_DISPLAY,
} from "./manifest";
import { ICON_192_PATH, ICON_512_PATH, SITE_NAME } from "@/lib/seo/site";

describe("pwaStartUrl", () => {
  it("points at Officer Hub when the hub is public", () => {
    expect(pwaStartUrl(true)).toBe("/en/app/");
  });

  it("points at the Comms home when the hub is soft-launched", () => {
    expect(pwaStartUrl(false)).toBe("/en/");
  });
});

describe("buildWebManifest", () => {
  it("meets Chromium installability fields for soft-launch", () => {
    const manifest = buildWebManifest({ officerHubPublic: false });
    expect(assertManifestInstallable(manifest)).toEqual([]);
    expect(manifest.name).toBe(SITE_NAME);
    expect(manifest.short_name).toBe(SITE_NAME);
    expect(manifest.start_url).toBe("/en/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(PWA_INSTALLABLE_DISPLAY.has(manifest.display!)).toBe(true);
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: ICON_192_PATH,
          sizes: "192x192",
          type: "image/png",
        }),
        expect.objectContaining({
          src: ICON_512_PATH,
          sizes: "512x512",
          type: "image/png",
        }),
      ]),
    );
  });

  it("uses hub start_url when Officer Hub is public", () => {
    const manifest = buildWebManifest({ officerHubPublic: true });
    expect(manifest.start_url).toBe("/en/app/");
    expect(assertManifestInstallable(manifest)).toEqual([]);
  });

  it("allows overrides for self-host branding tests", () => {
    const manifest = buildWebManifest({
      officerHubPublic: false,
      name: "Local Hub",
      shortName: "Hub",
      description: "Test",
      themeColor: "#112233",
      icon192: "/custom-192.png",
      icon512: "/custom-512.png",
    });
    expect(manifest.name).toBe("Local Hub");
    expect(manifest.short_name).toBe("Hub");
    expect(manifest.theme_color).toBe("#112233");
    expect(manifest.icons?.[0]?.src).toBe("/custom-192.png");
    expect(manifest.icons?.[1]?.src).toBe("/custom-512.png");
  });
});

describe("assertManifestInstallable", () => {
  it("reports missing name, start_url, display, and icons", () => {
    const errors = assertManifestInstallable({
      name: undefined,
      short_name: undefined,
      start_url: undefined,
      display: "browser",
      icons: [],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        "manifest needs name or short_name",
        "manifest needs start_url",
        expect.stringContaining("manifest display must be one of"),
        "manifest needs a 192x192 icon",
        "manifest needs a 512x512 icon",
      ]),
    );
  });

  it("accepts short_name alone and fullscreen display", () => {
    expect(
      assertManifestInstallable({
        short_name: "UnionOps",
        start_url: "/en/",
        display: "fullscreen",
        icons: [
          { src: "/a.png", sizes: "192x192" },
          { src: "/b.png", sizes: "512x512" },
        ],
      }),
    ).toEqual([]);
  });
});

describe("PWA icon assets on disk", () => {
  it("ships the 192 and 512 icons referenced by the manifest", () => {
    const root = path.resolve(__dirname, "../../..");
    for (const iconPath of [ICON_192_PATH, ICON_512_PATH]) {
      const absolute = path.join(root, "public", iconPath.replace(/^\//, ""));
      expect(fs.existsSync(absolute), `missing ${absolute}`).toBe(true);
    }
  });
});
