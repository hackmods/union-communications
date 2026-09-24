import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { stampRoster } from "@/lib/org-chart";
import { emptyWebsiteDraft } from "@/types/website-draft";
import { composeWebsiteTemplateData } from "./compose-website-data";

describe("composeWebsiteTemplateData", () => {
  const roster = stampRoster([
    {
      id: "p1",
      name: "Ada",
      role: "President",
      location: "Campus",
      group: "executive",
      showOnWebsite: true,
    },
  ]);

  it("prefers roster officers when draft is not overriding", () => {
    const data = composeWebsiteTemplateData({
      brandKit: DEFAULT_BRAND_KIT,
      roster,
      draft: emptyWebsiteDraft({
        unionName: "Local Test",
        heroText: "Welcome",
        about1: "About",
        officersOverride: false,
        officers: [{ name: "Old", role: "VP", location: "" }],
      }),
      logoPreviewSrc: "",
    });
    expect(data.officers[0]?.name).toBe("Ada");
    expect(data.heroText).toBe("Welcome");
    expect(data.unionName).toBe("Local Test");
  });

  it("uses draft officers when override is on", () => {
    const data = composeWebsiteTemplateData({
      brandKit: DEFAULT_BRAND_KIT,
      roster,
      draft: emptyWebsiteDraft({
        officersOverride: true,
        officers: [{ name: "Manual", role: "Secretary", location: "" }],
      }),
      logoPreviewSrc: "",
    });
    expect(data.officers).toEqual([
      { name: "Manual", role: "Secretary", location: "" },
    ]);
  });
});
