import { describe, expect, it } from "vitest";
import {
  DEFAULT_PORTAL_SURFACES,
  PRESIDENT_HUB_DEFAULT_OFF,
  PRESIDENT_HUB_DEFAULT_ON,
  PRESIDENT_OVERLAY_MODULES,
  applyHubModuleToggle,
  applyPortalSurfaceToggle,
  portalNavLinkAllowed,
  resolvePortalSurfaces,
} from "./module-catalog";

describe("president module catalog", () => {
  it("pre-enables executive Hub modules and keeps time off", () => {
    expect(PRESIDENT_HUB_DEFAULT_ON).toEqual([
      "comms",
      "grievance",
      "discussions",
      "bylaws",
      "proposals",
      "portal",
    ]);
    expect(PRESIDENT_HUB_DEFAULT_OFF).toContain("time");
    expect(PRESIDENT_OVERLAY_MODULES).toEqual([...PRESIDENT_HUB_DEFAULT_ON]);
    expect(PRESIDENT_OVERLAY_MODULES).not.toContain("time");
  });

  it("defaults Local Portal surfaces for members", () => {
    expect(DEFAULT_PORTAL_SURFACES).toEqual([
      "announcements",
      "news",
      "elections",
      "discussions",
      "myCases",
      "sidebars",
      "feedback",
    ]);
    expect(resolvePortalSurfaces(undefined)).toEqual([
      ...DEFAULT_PORTAL_SURFACES,
    ]);
  });

  it("gates portal nav links by surface + Hub module", () => {
    const surfaces = resolvePortalSurfaces(["announcements", "discussions"]);
    expect(
      portalNavLinkAllowed("dispatch", surfaces, ["portal", "grievance"]),
    ).toBe(true);
    expect(
      portalNavLinkAllowed("fronts", surfaces, ["portal"]),
    ).toBe(false);
    expect(
      portalNavLinkAllowed("proposals", ["elections", "discussions"], [
        "portal",
      ]),
    ).toBe(false);
    expect(
      portalNavLinkAllowed("proposals", ["elections", "discussions"], [
        "portal",
        "proposals",
      ]),
    ).toBe(true);
  });

  it("applies Hub and Portal toggles without emptying the lists", () => {
    expect(applyHubModuleToggle(["comms"], "grievance", true)).toEqual([
      "comms",
      "grievance",
    ]);
    expect(applyHubModuleToggle(["comms"], "comms", false)).toEqual(["comms"]);
    expect(
      applyPortalSurfaceToggle(
        ["announcements", "discussions"],
        "announcements",
        false,
      ),
    ).toEqual(["discussions"]);
    expect(
      applyPortalSurfaceToggle(["discussions"], "discussions", false),
    ).toEqual(["discussions"]);
  });
});
