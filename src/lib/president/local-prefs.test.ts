import { describe, expect, it } from "vitest";
import {
  DESTRUCTIVE_HUB_MODULES,
  getPresidentPreset,
  isDestructiveHubOff,
  resolveLocalHubModules,
  sameModuleSet,
} from "./module-catalog";
import {
  getLocalPresentationPrefs,
  resetLocalPresentationPrefsForTests,
  resolveHubModulesForLocal,
  setLocalPresentationPrefs,
} from "./local-prefs";

describe("president presets and destructive guards", () => {
  it("keeps Workforce Time off in calm and campaign presets", () => {
    expect(getPresidentPreset("calmStart").modules).not.toContain("time");
    expect(getPresidentPreset("campaign").modules).not.toContain("time");
    expect(getPresidentPreset("bargainingSeason").modules).toContain("tasks");
  });

  it("flags grievance and portal offs as destructive", () => {
    expect(DESTRUCTIVE_HUB_MODULES).toEqual(["grievance", "portal"]);
    expect(isDestructiveHubOff("grievance", false)).toBe(true);
    expect(isDestructiveHubOff("grievance", true)).toBe(false);
    expect(isDestructiveHubOff("time", false)).toBe(false);
  });

  it("intersects local presentation with union modules", () => {
    expect(
      resolveLocalHubModules(
        ["comms", "grievance", "portal", "time"],
        ["grievance", "time", "bumping"],
      ),
    ).toEqual(["grievance", "time"]);
  });

  it("stores local prefs and resolves Hub modules", () => {
    resetLocalPresentationPrefsForTests();
    setLocalPresentationPrefs("u1", "l1", {
      hubModules: ["grievance", "portal"],
      portalSurfaces: ["discussions", "announcements"],
    });
    expect(getLocalPresentationPrefs("u1", "l1")?.hubModules).toEqual([
      "grievance",
      "portal",
    ]);
    expect(
      resolveHubModulesForLocal("u1", "l1", [
        "comms",
        "grievance",
        "portal",
        "time",
      ]),
    ).toEqual(["grievance", "portal"]);
    expect(
      sameModuleSet(["comms", "portal"], ["portal", "comms"]),
    ).toBe(true);
  });
});
