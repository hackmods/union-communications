import { describe, expect, it } from "vitest";
import {
  hiddenGuidePathsForPreset,
  isGuideHiddenForPreset,
} from "@/lib/comms/preset-guide-visibility";
import { visiblePublicCatalog } from "@/lib/comms/public-catalog";

describe("preset guide visibility", () => {
  it("hides bargaining for the OPSEU Brand Kit preset", () => {
    expect(isGuideHiddenForPreset("/guide/bargaining", "opseu")).toBe(true);
    expect(isGuideHiddenForPreset("/learn/bargaining", "opseu")).toBe(true);
    expect(isGuideHiddenForPreset("/guide/bargaining", "cupe")).toBe(false);
    expect(isGuideHiddenForPreset("/guide/strike", "opseu")).toBe(false);
  });

  it("removes bargaining from the public catalog when OPSEU is selected", () => {
    const withOpseu = visiblePublicCatalog({
      authenticated: false,
      officerHubPublic: true,
      unionPresetId: "opseu",
    });
    const without = visiblePublicCatalog({
      authenticated: false,
      officerHubPublic: true,
    });
    expect(without.some((item) => item.canonicalPath === "/learn/bargaining")).toBe(true);
    expect(withOpseu.some((item) => item.canonicalPath === "/learn/bargaining")).toBe(false);
    expect(hiddenGuidePathsForPreset("opseu")).toEqual(
      expect.arrayContaining(["/guide/bargaining", "/learn/bargaining"]),
    );
  });
});
