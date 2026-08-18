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

  it("treats identity, examples, graphic, and quote as join hrefs", () => {
    expect(isWorkshopDemoJoinHref("/brand-kit")).toBe(true);
    expect(isWorkshopDemoJoinHref("/onboarding")).toBe(true);
    expect(isWorkshopDemoJoinHref("/tools/logo-builder")).toBe(true);
    expect(isWorkshopDemoJoinHref("/examples")).toBe(true);
    expect(isWorkshopDemoJoinHref("/tools/graphic-maker")).toBe(true);
    expect(isWorkshopDemoJoinHref("/tools/quote-card")).toBe(true);
    expect(isWorkshopDemoJoinHref("/tools/website-template")).toBe(true);
    expect(isWorkshopDemoJoinHref("/tools/board-notice")).toBe(false);
    expect(isWorkshopDemoJoinHref("/captions")).toBe(false);
    expect(isWorkshopDemoJoinHref("/tools/flyer-maker")).toBe(false);
  });

  it("completes after logo, examples, graphic, quote, and website", () => {
    expect(hasCompletedWorkshopDemoQuartet()).toBe(false);
    markWorkshopDemoStep("/tools/logo-builder");
    markWorkshopDemoStep("/examples");
    markWorkshopDemoStep("/tools/graphic-maker");
    markWorkshopDemoStep("/tools/quote-card");
    expect(hasCompletedWorkshopDemoQuartet()).toBe(false);
    markWorkshopDemoStep("/tools/website-template");
    expect(hasCompletedWorkshopDemoQuartet()).toBe(true);
  });

  it("counts onboarding and Brand Kit as the Logo Builder stop", () => {
    expect(canonicalWorkshopDemoHref("/onboarding")).toBe("/tools/logo-builder");
    expect(canonicalWorkshopDemoHref("/brand-kit")).toBe("/tools/logo-builder");
    markWorkshopDemoStep("/onboarding");
    markWorkshopDemoStep("/examples");
    markWorkshopDemoStep("/tools/graphic-maker");
    markWorkshopDemoStep("/tools/quote-card");
    markWorkshopDemoStep("/tools/website-template");
    expect(hasCompletedWorkshopDemoQuartet()).toBe(true);
  });
});
