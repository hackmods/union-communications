import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEBSITE_HERO_ART_ID,
  isWebsiteHeroArtId,
  isWebsiteHeroSampleId,
  resolveWebsiteHeroArt,
  websiteHeroUploadFileName,
} from "@/lib/templates/website/hero-art";

describe("website hero art catalog", () => {
  it("treats unknown and omitted ids as colour-only", () => {
    expect(isWebsiteHeroArtId("bands")).toBe(true);
    expect(isWebsiteHeroArtId("none")).toBe(true);
    expect(isWebsiteHeroArtId("niagara")).toBe(false);
    expect(isWebsiteHeroSampleId("none")).toBe(false);
    expect(resolveWebsiteHeroArt({})).toBeNull();
    expect(resolveWebsiteHeroArt({ heroArtId: "none" })).toBeNull();
    expect(resolveWebsiteHeroArt({ heroArtId: "not-a-pattern" })).toBeNull();
  });

  it("defaults the tool to the bands pattern and maps ZIP + preview paths", () => {
    expect(DEFAULT_WEBSITE_HERO_ART_ID).toBe("bands");
    const art = resolveWebsiteHeroArt({ heroArtId: "bands" });
    expect(art?.kind).toBe("pattern");
    expect(art?.zipFileName).toBe("hero.svg");
    expect(art?.zipSrc).toBe("./assets/hero.svg");
    expect(art?.previewSrc).toBe("/assets/website-heroes/bands.svg");
    expect(art?.alt).toBe("");
  });

  it("lets an uploaded photo win over a catalog pattern", () => {
    const art = resolveWebsiteHeroArt({
      heroArtId: "mesh",
      heroImagePreviewSrc: "data:image/jpeg;base64,abc",
      heroImageFileName: "hero.jpg",
      heroImageAlt: 'Stewards at a <rally>',
    });
    expect(art?.kind).toBe("photo");
    expect(art?.zipSrc).toBe("./assets/hero.jpg");
    expect(art?.previewSrc).toBe("data:image/jpeg;base64,abc");
    expect(art?.alt).toBe("Stewards at a <rally>");
  });

  it("picks a ZIP filename from the data-URL MIME", () => {
    expect(websiteHeroUploadFileName("data:image/png;base64,x")).toBe("hero.png");
    expect(websiteHeroUploadFileName("data:image/webp;base64,x")).toBe(
      "hero.webp",
    );
    expect(websiteHeroUploadFileName("data:image/svg+xml;base64,x")).toBe(
      "hero.svg",
    );
    expect(websiteHeroUploadFileName("data:image/jpeg;base64,x")).toBe(
      "hero.jpg",
    );
  });
});
