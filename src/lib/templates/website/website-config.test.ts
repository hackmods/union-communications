import { describe, expect, it } from "vitest";
import type { WebsiteTemplateData } from "@/types/website-template";
import {
  WEBSITE_CONFIG_FILE,
  WEBSITE_CONFIG_KIND,
  WebsiteConfigParseError,
  buildWebsiteConfigJson,
  findWebsiteConfigPath,
  isSafeWebsiteZipAssetPath,
  parseWebsiteConfigJson,
  parseWebsiteConfigZip,
  serializeWebsiteConfig,
} from "@/lib/templates/website/website-config";

const sample: WebsiteTemplateData = {
  localNumber: "243",
  unionName: "Local 243",
  heroText: "Support staff united.",
  about1: "About paragraph one.",
  about2: "About paragraph two.",
  contactEmail: "local243@example.com",
  facebookUrl: "https://facebook.com/groups/example",
  customLinks: [
    { label: "Instagram", url: "https://instagram.com/local243" },
    { label: "Nope", url: "javascript:alert(1)" },
  ],
  membershipLinks: [
    { label: "Join", url: "https://example.com/join" },
  ],
  officeAddress: "North Pole, Arctic Circle",
  primaryColor: "#111111",
  secondaryColor: "#FFFFFF",
  officers: [{ name: "Jane Doe", role: "President", location: "WC-101" }],
  logoFileName: "logo.png",
  logoPreviewSrc: "data:image/png;base64,aaa",
  logoAlt: "Local 243",
  includeOpseuResources: false,
  heroArtId: "bands",
  heroImageFileName: "hero.jpg",
  heroImagePreviewSrc: "data:image/jpeg;base64,abc",
  heroImageAlt: "Rally photo",
  canvas: { headlineFontId: "oswald", bodyFontId: "sourceSans" },
};

describe("serializeWebsiteConfig", () => {
  it("round-trips text fields and strips preview data URLs", () => {
    const json = buildWebsiteConfigJson(sample);
    expect(json).not.toContain("data:image");
    expect(json).not.toContain("logoPreviewSrc");
    expect(json).not.toContain("heroImagePreviewSrc");
    const parsed = parseWebsiteConfigJson(json);
    expect(parsed.kind).toBe(WEBSITE_CONFIG_KIND);
    expect(parsed.version).toBe(1);
    expect(parsed.data.unionName).toBe("Local 243");
    expect(parsed.data.officers).toEqual(sample.officers);
    expect(parsed.data.heroArtId).toBe("bands");
    expect(parsed.data.heroImageFileName).toBe("hero.jpg");
    expect(parsed.data.canvas?.headlineFontId).toBe("oswald");
    expect(parsed.data.customLinks).toEqual([
      { label: "Instagram", url: "https://instagram.com/local243" },
    ]);
    expect(parsed.data.membershipLinks).toEqual([
      { label: "Join", url: "https://example.com/join" },
    ]);
  });

  it("drops javascript: links instead of keeping them", () => {
    const envelope = serializeWebsiteConfig(sample);
    expect(envelope.data.customLinks.some((l) => l.url.startsWith("javascript:"))).toBe(
      false,
    );
  });
});

describe("parseWebsiteConfigJson", () => {
  it("rejects invalid JSON", () => {
    expect(() => parseWebsiteConfigJson("{not json")).toThrow(WebsiteConfigParseError);
    try {
      parseWebsiteConfigJson("{not json");
    } catch (error) {
      expect(error).toBeInstanceOf(WebsiteConfigParseError);
      expect((error as WebsiteConfigParseError).code).toBe("invalid");
    }
  });

  it("rejects the wrong kind or version", () => {
    const payload = serializeWebsiteConfig(sample);
    expect(() =>
      parseWebsiteConfigJson(
        JSON.stringify({ ...payload, kind: "brand-kit" }),
      ),
    ).toThrow(WebsiteConfigParseError);
    try {
      parseWebsiteConfigJson(JSON.stringify({ ...payload, version: 2 }));
    } catch (error) {
      expect((error as WebsiteConfigParseError).code).toBe("wrongKind");
    }
  });

  it("drops unsafe links on import", () => {
    const payload = serializeWebsiteConfig(sample);
    payload.data.customLinks = [
      { label: "Bad", url: "javascript:alert(1)" },
      { label: "Ok", url: "https://example.com/ok" },
    ];
    const parsed = parseWebsiteConfigJson(JSON.stringify(payload));
    expect(parsed.data.customLinks).toEqual([
      { label: "Ok", url: "https://example.com/ok" },
    ]);
  });
});

describe("ZIP path helpers", () => {
  it("finds the config at the ZIP root or in a theme folder", () => {
    expect(findWebsiteConfigPath(["index.html", WEBSITE_CONFIG_FILE])).toBe(
      WEBSITE_CONFIG_FILE,
    );
    expect(
      findWebsiteConfigPath([
        "unionops-local-243/style.css",
        "unionops-local-243/unionops-website.json",
      ]),
    ).toBe("unionops-local-243/unionops-website.json");
    expect(findWebsiteConfigPath(["../unionops-website.json"])).toBeNull();
  });

  it("allows only assets/{logo|hero}.* paths", () => {
    expect(isSafeWebsiteZipAssetPath("assets/hero.jpg", "hero.jpg")).toBe(true);
    expect(
      isSafeWebsiteZipAssetPath("unionops-local-243/assets/logo.png", "logo.png"),
    ).toBe(true);
    expect(isSafeWebsiteZipAssetPath("assets/../secret.png", "secret.png")).toBe(
      false,
    );
    expect(isSafeWebsiteZipAssetPath("js/site.js", "site.js")).toBe(false);
  });
});

describe("parseWebsiteConfigZip", () => {
  it("reads a nested WordPress theme config and restores a hero photo", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const envelope = serializeWebsiteConfig(sample, "2026-08-20T12:00:00.000Z");
    zip.file(
      "unionops-local-243/unionops-website.json",
      JSON.stringify(envelope, null, 2),
    );
    const heroBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    zip.file("unionops-local-243/assets/hero.jpg", heroBytes);
    const blob = await zip.generateAsync({ type: "arraybuffer" });
    const imported = await parseWebsiteConfigZip(blob);
    expect(imported.envelope.data.unionName).toBe("Local 243");
    expect(imported.heroImage?.fileName).toBe("hero.jpg");
    expect(imported.heroImage?.bytes).toEqual(heroBytes);
    expect(imported.heroImage?.previewSrc.startsWith("data:image/jpeg;base64,")).toBe(
      true,
    );
  });

  it("rejects a ZIP with no site file", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("index.html", "<html></html>");
    const blob = await zip.generateAsync({ type: "arraybuffer" });
    try {
      await parseWebsiteConfigZip(blob);
      expect.unreachable();
    } catch (error) {
      expect((error as WebsiteConfigParseError).code).toBe("missing");
    }
  });
});
