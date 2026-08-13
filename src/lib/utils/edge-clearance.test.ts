import { describe, expect, it } from "vitest";
import {
  SOCIAL_SAFE_ZONE_INSETS,
  ZERO_INSETS,
  defaultEdgeClearanceForMedium,
  insetsForProfile,
  insetsToInsetStyle,
  isZeroInsets,
  profileForMeetingOrientation,
  profileForSolidarityFormat,
  uniformInsets,
} from "./edge-clearance";

describe("insetsForProfile", () => {
  it("returns zero insets when clearance is off", () => {
    expect(insetsForProfile("desktop", false)).toEqual(ZERO_INSETS);
    expect(insetsForProfile("meeting", false)).toEqual(ZERO_INSETS);
    expect(isZeroInsets(insetsForProfile("print", false))).toBe(true);
  });

  it("uses extra bottom for desktop taskbar crop", () => {
    const insets = insetsForProfile("desktop");
    expect(insets.bottom).toBe(0.1);
    expect(insets.top).toBe(0.04);
    expect(insets.left).toBe(0.04);
    expect(insets.right).toBe(0.04);
  });

  it("uses extra sides for ultrawide on 16:9 monitors", () => {
    const insets = insetsForProfile("ultrawide");
    expect(insets.left).toBe(0.12);
    expect(insets.right).toBe(0.12);
    expect(insets.bottom).toBe(0.1);
  });

  it("uses extra top and bottom for phone notch and home indicator", () => {
    const insets = insetsForProfile("phone");
    expect(insets.top).toBe(0.12);
    expect(insets.bottom).toBe(0.1);
    expect(insets.left).toBe(0.04);
    expect(insets.right).toBe(0.04);
  });

  it("insets all meeting edges with extra bottom for cover-fit and taskbar reuse", () => {
    const insets = insetsForProfile("meeting");
    expect(insets.top).toBe(0.08);
    expect(insets.left).toBe(0.08);
    expect(insets.right).toBe(0.08);
    expect(insets.bottom).toBe(0.1);
  });

  it("uses a modest even inset for print", () => {
    const insets = insetsForProfile("print");
    expect(insets).toEqual({
      top: 0.05,
      right: 0.05,
      bottom: 0.05,
      left: 0.05,
    });
  });
});

describe("insetsToInsetStyle", () => {
  it("emits CSS percent strings from fractions", () => {
    expect(insetsToInsetStyle(insetsForProfile("desktop"))).toEqual({
      top: "4%",
      right: "4%",
      bottom: "10%",
      left: "4%",
    });
  });

  it("emits zeros for the off profile", () => {
    expect(insetsToInsetStyle(ZERO_INSETS)).toEqual({
      top: "0%",
      right: "0%",
      bottom: "0%",
      left: "0%",
    });
  });
});

describe("format mapping", () => {
  it("maps solidarity formats to profiles", () => {
    expect(profileForSolidarityFormat("horizontal")).toBe("desktop");
    expect(profileForSolidarityFormat("wide")).toBe("ultrawide");
    expect(profileForSolidarityFormat("vertical")).toBe("phone");
    expect(profileForSolidarityFormat("letter")).toBe("print");
    expect(profileForSolidarityFormat("tabloid")).toBe("print");
  });

  it("maps meeting orientation to profiles", () => {
    expect(profileForMeetingOrientation("landscape")).toBe("meeting");
    expect(profileForMeetingOrientation("portrait")).toBe("phone");
  });

  it("defaults digital on and print off", () => {
    expect(defaultEdgeClearanceForMedium("digital")).toBe(true);
    expect(defaultEdgeClearanceForMedium("print")).toBe(false);
  });
});

describe("uniformInsets", () => {
  it("matches the resizer social overlay", () => {
    expect(uniformInsets(0.1)).toEqual(SOCIAL_SAFE_ZONE_INSETS);
    expect(isZeroInsets(uniformInsets(0))).toBe(true);
  });
});
