import { describe, expect, it } from "vitest";
import {
  isPublicPrimaryNavActive,
  PUBLIC_PRIMARY_NAV,
  PULSE_POLL_HREF,
  toolGroups,
} from "./nav-config";

describe("public primary navigation", () => {
  it("keeps Start, Brand Kit, Create, and Learn as direct navigation destinations", () => {
    expect(PUBLIC_PRIMARY_NAV).toEqual([
      { href: "/start", key: "start" },
      { href: "/create/brand-kit", key: "brandKit" },
      { href: "/create", key: "create" },
      { href: "/learn", key: "learn" },
    ]);
  });

  it("keeps Brand Kit, Create, and Start active states distinct", () => {
    expect(isPublicPrimaryNavActive("/create/brand-kit", "/create/brand-kit")).toBe(true);
    expect(isPublicPrimaryNavActive("/create/brand-kit", "/create")).toBe(false);
    expect(isPublicPrimaryNavActive("/create/flyer-maker", "/create")).toBe(true);
    expect(isPublicPrimaryNavActive("/start", "/start")).toBe(true);
    expect(isPublicPrimaryNavActive("/start?step=brand", "/start")).toBe(false);
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
  });

});
