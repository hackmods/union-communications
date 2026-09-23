import { describe, expect, it } from "vitest";
import {
  DEFAULT_PORTAL_SURFACES,
  PRESIDENT_HUB_DEFAULT_OFF,
  PRESIDENT_HUB_DEFAULT_ON,
  PRESIDENT_OVERLAY_MODULES,
  applyHubModuleToggle,
  applyPortalSurfaceToggle,
  getPresidentPreset,
  isDestructiveHubOff,
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

  it("exposes calm / bargaining / campaign presets without Workforce Time", () => {
    expect(getPresidentPreset("calmStart").modules).not.toContain("time");
    expect(getPresidentPreset("campaign").modules).not.toContain("time");
    expect(getPresidentPreset("bargainingSeason").modules).toContain("tasks");
    expect(isDestructiveHubOff("portal", false)).toBe(true);
  });

  it("hides Workforce Time from president config when platform gate is off", async () => {
    const { visibleHubConfigRows } = await import("./module-catalog");
    expect(
      visibleHubConfigRows({
        NEXT_PUBLIC_WORKFORCE_TIME_ENABLED: undefined,
      }).some((row) => row.id === "time"),
    ).toBe(false);
    expect(
      visibleHubConfigRows({
        NEXT_PUBLIC_WORKFORCE_TIME_ENABLED: "true",
      }).some((row) => row.id === "time"),
    ).toBe(true);
  });
});
