import { describe, expect, it } from "vitest";
import {
  meetingBandPadPx,
  meetingCloserPx,
  meetingFieldPadPx,
  meetingHeadlineMinPx,
  meetingHeadlinePx,
  meetingLeadPx,
  meetingLocalLabelPx,
  meetingLogoMaxHeightPx,
  meetingLogoWidthPx,
} from "./meeting-background-chrome";

describe("meeting-background-chrome", () => {
  it("sizes HD landscape headlines in display range, not rem", () => {
    expect(meetingHeadlinePx(1920, "bar")).toBeGreaterThanOrEqual(80);
    expect(meetingHeadlinePx(1920, "corner")).toBeGreaterThan(
      meetingHeadlinePx(1920, "bar"),
    );
    expect(meetingHeadlinePx(1920, "readable")).toBeGreaterThanOrEqual(64);
    expect(meetingHeadlinePx(1920, "panel")).toBeGreaterThanOrEqual(64);
    expect(meetingHeadlineMinPx(1920, "bar")).toBeLessThan(
      meetingHeadlinePx(1920, "bar"),
    );
  });

  it("keeps portrait readable type above postage-stamp rem", () => {
    expect(meetingHeadlinePx(1080, "readable")).toBeGreaterThanOrEqual(36);
  });

  it("keeps lead/closer/local under the digital meta cap", () => {
    expect(meetingLeadPx(1920)).toBeLessThanOrEqual(20);
    expect(meetingCloserPx(1920)).toBeLessThanOrEqual(20);
    expect(meetingLocalLabelPx(1920)).toBeLessThanOrEqual(18);
    expect(meetingLeadPx(1920)).toBeGreaterThanOrEqual(16);
  });

  it("pads HD bars thicker than letter-token rem", () => {
    expect(meetingFieldPadPx(1920, false)).toBeGreaterThanOrEqual(56);
    expect(meetingBandPadPx(1920, false)).toBeGreaterThanOrEqual(32);
    expect(meetingFieldPadPx(1080, true)).toBeGreaterThanOrEqual(40);
  });

  it("sizes lockups from the canvas, not a 80px rem cap", () => {
    expect(meetingLogoWidthPx(1920, "md")).toBeGreaterThanOrEqual(350);
    expect(meetingLogoMaxHeightPx(1080, "md")).toBeGreaterThanOrEqual(120);
    expect(meetingLogoWidthPx(1920, "sm")).toBeLessThan(
      meetingLogoWidthPx(1920, "md"),
    );
  });
});
