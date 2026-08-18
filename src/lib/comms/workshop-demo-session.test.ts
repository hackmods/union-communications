import { afterEach, describe, expect, it } from "vitest";
import {
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
});
