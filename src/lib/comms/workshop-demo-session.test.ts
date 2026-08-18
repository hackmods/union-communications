import { afterEach, describe, expect, it } from "vitest";
import {
  canonicalWorkshopDemoHref,
  hasCompletedWorkshopDemoQuartet,
  isWorkshopDemoJoinHref,
  isWorkshopDemoSession,
  markWorkshopDemoSession,
  markWorkshopDemoStep,
  WORKSHOP_DEMO_SESSION_KEY,
  WORKSHOP_DEMO_VISITS_KEY,
} from "./workshop-demo-session";

describe("workshop demo session", () => {
  afterEach(() => {
    sessionStorage.removeItem(WORKSHOP_DEMO_SESSION_KEY);
    sessionStorage.removeItem(WORKSHOP_DEMO_VISITS_KEY);
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

  it("unlocks Website Template only after the four core stops", () => {
    expect(hasCompletedWorkshopDemoQuartet()).toBe(false);
    markWorkshopDemoStep("/brand-kit");
    markWorkshopDemoStep("/tools/board-notice");
    markWorkshopDemoStep("/tools/graphic-maker");
    expect(hasCompletedWorkshopDemoQuartet()).toBe(false);
    markWorkshopDemoStep("/captions");
    expect(hasCompletedWorkshopDemoQuartet()).toBe(true);
  });

  it("counts onboarding as the Brand Kit stop", () => {
    expect(canonicalWorkshopDemoHref("/onboarding")).toBe("/brand-kit");
    markWorkshopDemoStep("/onboarding");
    markWorkshopDemoStep("/tools/board-notice");
    markWorkshopDemoStep("/tools/graphic-maker");
    markWorkshopDemoStep("/captions");
    expect(hasCompletedWorkshopDemoQuartet()).toBe(true);
  });
});
