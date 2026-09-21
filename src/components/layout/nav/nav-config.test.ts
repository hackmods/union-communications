import { describe, expect, it } from "vitest";
import { PULSE_POLL_HREF, toolGroups } from "./nav-config";

describe("shared tool registry", () => {
  it("keeps job groups and tool paths represented", () => {
    expect(toolGroups.map((group) => group.labelKey)).toEqual([
      "toolsGroupBrand",
      "toolsGroupBoards",
      "toolsGroupPrint",
      "toolsGroupSocialWeb",
      "toolsGroupStewardWorksheets",
    ]);
    const hrefs = toolGroups.flatMap((group) => group.links.map((link) => link.href));
    expect(hrefs).toContain("/tools/logo-builder");
    expect(hrefs).toContain("/tools/flyer-maker");
    expect(hrefs).toContain("/tools/rules-of-order");
    expect(hrefs).toContain(PULSE_POLL_HREF);
  });

});
