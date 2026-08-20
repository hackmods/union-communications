import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { OPSEU_CAAT_SUPPORT_LABEL } from "@/lib/brand/opseu-sector-catalog";
import type { BrandKit } from "@/types/entities";
import {
  isWebsiteHttpUrl,
  joinWithConjunction,
  toWebsiteNavLinks,
  websiteCollectionLabels,
  websiteDisplayName,
} from "./brand-kit-fields";

function kit(patch: Partial<BrandKit> = {}): BrandKit {
  return { ...DEFAULT_BRAND_KIT, ...patch };
}

describe("websiteDisplayName", () => {
  it("uses Local N when no union is set", () => {
    expect(websiteDisplayName(kit(), "110")).toBe("Local 110");
  });

  it("prefixes the Brand Kit union preset name", () => {
    expect(websiteDisplayName(kit({ unionPresetId: "opseu" }), "243")).toBe(
      "OPSEU / SEFPO Local 243",
    );
    expect(websiteDisplayName(kit({ unionPresetId: "cupe" }), "123")).toBe(
      "CUPE Local 123",
    );
  });

  it("prefers an explicit Brand Kit unionName", () => {
    expect(
      websiteDisplayName(
        kit({ unionPresetId: "opseu", unionName: "OPSEU / SEFPO" }),
        "243",
      ),
    ).toBe("OPSEU / SEFPO Local 243");
  });

  it("does not title a site Other Local N", () => {
    expect(websiteDisplayName(kit({ unionPresetId: "other" }), "55")).toBe(
      "Local 55",
    );
  });
});

describe("websiteCollectionLabels", () => {
  it("returns nothing for the generic Local profile", () => {
    expect(websiteCollectionLabels(kit())).toEqual([]);
  });

  it("keeps named College Support and drops Other", () => {
    const labels = websiteCollectionLabels(
      kit({
        profiles: [
          {
            id: "profile-caat-s",
            label: OPSEU_CAAT_SUPPORT_LABEL,
            localNumber: "243",
            subText: OPSEU_CAAT_SUPPORT_LABEL,
          },
          {
            id: "profile-other",
            label: "Other",
            localNumber: "243",
            subText: "Other",
          },
        ],
      }),
    );
    expect(labels).toEqual([OPSEU_CAAT_SUPPORT_LABEL]);
    expect(labels.join(" ")).not.toMatch(/support staff/i);
  });
});

describe("joinWithConjunction", () => {
  it("joins two labels without a serial comma", () => {
    expect(joinWithConjunction(["Full-time", "Part-time"], "and")).toBe(
      "Full-time and Part-time",
    );
  });

  it("joins three labels with a serial comma", () => {
    expect(joinWithConjunction(["A", "B", "C"], "et")).toBe("A, B, et C");
  });
});

describe("toWebsiteNavLinks / isWebsiteHttpUrl", () => {
  it("keeps http(s) links with labels", () => {
    expect(
      toWebsiteNavLinks([
        { label: "Instagram", url: "https://instagram.com/local" },
        { label: "Campaign", url: "http://example.org/action" },
      ]),
    ).toHaveLength(2);
  });

  it("drops javascript, missing labels, and empty URLs", () => {
    expect(isWebsiteHttpUrl("javascript:alert(1)")).toBe(false);
    expect(
      toWebsiteNavLinks([
        { label: "Bad", url: "javascript:alert(1)" },
        { label: "", url: "https://example.com" },
        { label: "Gap", url: "   " },
      ]),
    ).toEqual([]);
  });
});
