import { describe, expect, it } from "vitest";
import {
  isPublicPrimaryNavActive,
  PUBLIC_PRIMARY_NAV,
  PULSE_POLL_HREF,
  toolGroups,
  UTILITY_TOOL_SLUGS,
  toolSurfaceForSlug,
  shellContextForPath,
  primaryNavForContext,
} from "./nav-config";

describe("public primary navigation", () => {
  it("keeps catalog roots public with or without trailing slashes", () => {
    for (const path of ["/", "/create", "/create/", "/utilities/", "/learn/", "/platform/"]) {
      expect(shellContextForPath(path)).toBe("public");
    }
  });

  it("uses task chrome without conflating route prefixes", () => {
    expect(shellContextForPath("/create/graphic-maker/")).toBe("public-task");
    expect(shellContextForPath("/utilities/rtw-accommodation/")).toBe("public-task");
    expect(shellContextForPath("/app/")).toBe("hub");
    expect(shellContextForPath("/portal/circles/example/")).toBe("portal");
    expect(shellContextForPath("/application")).toBe("public");
    expect(primaryNavForContext("hub").map((item) => item.key)).toEqual([
      "brandKit",
      "create",
      "utilities",
      "learn",
      "platform",
    ]);
    expect(primaryNavForContext("public-task").map((item) => item.key)).toEqual([
      "brandKit",
      "create",
      "utilities",
      "learn",
      "platform",
    ]);
    expect(primaryNavForContext("portal").map((item) => item.key)).toEqual(
      primaryNavForContext("public").map((item) => item.key),
    );
  });

  it("keeps Brand Kit, Create, Utilities, Learn, and Platform as direct destinations", () => {
    expect(PUBLIC_PRIMARY_NAV).toEqual([
      { href: "/create/brand-kit", key: "brandKit" },
      { href: "/create", key: "create" },
      { href: "/utilities", key: "utilities" },
      { href: "/learn", key: "learn" },
      { href: "/platform", key: "platform" },
    ]);
  });

  it("keeps Brand Kit, Create, and Utilities active states distinct", () => {
    expect(isPublicPrimaryNavActive("/create/brand-kit", "/create/brand-kit")).toBe(true);
    expect(isPublicPrimaryNavActive("/create/brand-kit", "/create")).toBe(false);
    expect(isPublicPrimaryNavActive("/create/flyer-maker", "/create")).toBe(true);
    expect(isPublicPrimaryNavActive("/utilities/rtw-accommodation", "/utilities")).toBe(true);
    expect(isPublicPrimaryNavActive("/utilities", "/create")).toBe(false);
    expect(isPublicPrimaryNavActive("/platform", "/platform")).toBe(true);
  });
});

describe("shared tool registry", () => {
  it("keeps job groups and tool paths represented", () => {
    expect(toolGroups.map((group) => group.labelKey)).toEqual([
      "toolsGroupCreation",
      "toolsGroupUtility",
    ]);
    const hrefs = toolGroups.flatMap((group) => group.links.map((link) => link.href));
    expect(hrefs).toContain("/tools/logo-builder");
    expect(hrefs).toContain("/tools/flyer-maker");
    expect(hrefs).toContain("/tools/rules-of-order");
    expect(hrefs).toContain(PULSE_POLL_HREF);
    expect(hrefs).toContain("/tools/rtw-accommodation");
    const createHrefs = toolGroups
      .find((group) => group.labelKey === "toolsGroupCreation")!
      .links.map((link) => link.href);
    const utilityHrefs = toolGroups
      .find((group) => group.labelKey === "toolsGroupUtility")!
      .links.map((link) => link.href);
    expect(createHrefs).not.toContain("/tools/rtw-accommodation");
    expect(createHrefs).toContain(PULSE_POLL_HREF);
    expect(createHrefs).toContain("/tools/local-pack");
    expect(utilityHrefs).not.toContain(PULSE_POLL_HREF);
    expect(utilityHrefs).not.toContain("/tools/local-pack");
  });

  it("classifies utility slugs for the Utilities surface", () => {
    expect(UTILITY_TOOL_SLUGS).toContain("rtw-accommodation");
    expect(toolSurfaceForSlug("flyer-maker")).toBe("create");
    expect(toolSurfaceForSlug("pulse-poll")).toBe("create");
    expect(toolSurfaceForSlug("local-pack")).toBe("create");
    expect(toolSurfaceForSlug("rtw-accommodation")).toBe("utilities");
  });
});
