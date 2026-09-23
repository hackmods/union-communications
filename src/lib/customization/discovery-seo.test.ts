import { describe, expect, it } from "vitest";
import { PUBLIC_PATHS } from "@/app/sitemap";
import { composePublicDiscoveryCatalog, mayExposeInPublicCatalog } from "@/lib/customization/discovery";

describe("customization discovery SEO guards", () => {
  it("never lists scoped custom-guide routes in the public sitemap registry", () => {
    expect(PUBLIC_PATHS.some((path) => path.includes("/learn/custom"))).toBe(false);
  });

  it("keeps member-only and teaser-off entries out of anonymous catalogs", () => {
    expect(mayExposeInPublicCatalog({
      audience: "local_officer",
      enabled: true,
      teaserEnabled: true,
    })).toBe(false);
    expect(composePublicDiscoveryCatalog([
      {
        key: "guide:secret",
        title: "Secret",
        summary: "nope",
        canonicalPath: "/learn/custom/x/secret",
        officerOnlyTitle: "leak",
      },
    ], { teaserEnabled: true })).toEqual([{
      key: "guide:secret",
      title: "Secret",
      summary: "nope",
      canonicalPath: "/learn/custom/x/secret",
    }]);
  });
});
