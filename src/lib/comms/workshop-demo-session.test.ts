import { afterEach, describe, expect, it } from "vitest";
import {
  isWorkshopDemoJoinHref,
  isWorkshopDemoSession,
  markWorkshopDemoSession,
  WORKSHOP_DEMO_SESSION_KEY,
} from "./workshop-demo-session";

describe("workshop demo session", () => {
  afterEach(() => {
    sessionStorage.removeItem(WORKSHOP_DEMO_SESSION_KEY);
  });

  it("is inactive until marked", () => {
    expect(isWorkshopDemoSession()).toBe(false);
    markWorkshopDemoSession();
    expect(isWorkshopDemoSession()).toBe(true);
  });

  it("treats Brand Kit, onboarding, board notice, graphic, and captions as join hrefs", () => {
    expect(isWorkshopDemoJoinHref("/brand-kit")).toBe(true);
    expect(isWorkshopDemoJoinHref("/onboarding")).toBe(true);
    expect(isWorkshopDemoJoinHref("/tools/board-notice")).toBe(true);
    expect(isWorkshopDemoJoinHref("/tools/graphic-maker")).toBe(true);
    expect(isWorkshopDemoJoinHref("/captions")).toBe(true);
    expect(isWorkshopDemoJoinHref("/tools/flyer-maker")).toBe(false);
    expect(isWorkshopDemoJoinHref("/guide/social-media-plan")).toBe(false);
  });
});
