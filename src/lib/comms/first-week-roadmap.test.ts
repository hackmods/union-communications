import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import {
  FIRST_WEEK_STEP_KEYS,
  FIRST_WEEK_STEP_LINKS,
} from "./first-week-roadmap";

describe("FIRST_WEEK_STEP_KEYS", () => {
  it("places print after boards and before socials", () => {
    expect([...FIRST_WEEK_STEP_KEYS]).toEqual([
      "logo",
      "boards",
      "print",
      "socials",
      "website",
    ]);
  });

  it("links print to Flyer Maker and Print Guide", () => {
    expect(FIRST_WEEK_STEP_LINKS.print).toEqual({
      primary: "/tools/flyer-maker",
      secondary: "/guide/print",
    });
  });

  it("has matching EN/FR step copy for every roadmap key", () => {
    for (const key of FIRST_WEEK_STEP_KEYS) {
      const enStep = en.socialMediaPlan.steps[key];
      const frStep = fr.socialMediaPlan.steps[key];
      expect(enStep?.title, `en steps.${key}.title`).toBeTruthy();
      expect(frStep?.title, `fr steps.${key}.title`).toBeTruthy();
      expect(enStep?.cta).toBeTruthy();
      expect(frStep?.cta).toBeTruthy();
      expect(Array.isArray(enStep?.checklist)).toBe(true);
      expect(Array.isArray(frStep?.checklist)).toBe(true);
      expect(enStep!.checklist.length).toBeGreaterThan(0);
      expect(frStep!.checklist.length).toBe(enStep!.checklist.length);
    }
  });
});
