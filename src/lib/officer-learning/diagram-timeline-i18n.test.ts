import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import { OFFICER_LEARNING_MODULES } from "./modules";
import { MODULE_TIMELINE_PHASES } from "@/components/officer-learning/ModuleWorkedTimeline";

type Nested = Record<string, unknown>;

function hasPath(root: Nested, parts: string[]): boolean {
  let cur: unknown = root;
  for (const part of parts) {
    if (!cur || typeof cur !== "object" || !(part in (cur as Nested))) {
      return false;
    }
    cur = (cur as Nested)[part];
  }
  return typeof cur === "string" && cur.length > 0;
}

describe("officer learning diagram/timeline i18n", () => {
  it("has timeline title/aria/caption + phase labels for every catalog slug", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      const phases = MODULE_TIMELINE_PHASES[meta.slug];
      expect(phases, `${meta.slug} missing MODULE_TIMELINE_PHASES`).toBeTruthy();
      for (const locale of [en, fr] as const) {
        const base = ["officerLearning", "timelines", meta.slug];
        expect(
          hasPath(locale as Nested, [...base, "title"]),
          `${meta.slug} timeline title`,
        ).toBe(true);
        expect(
          hasPath(locale as Nested, [...base, "aria"]),
          `${meta.slug} timeline aria`,
        ).toBe(true);
        for (const phase of phases!) {
          expect(
            hasPath(locale as Nested, [...base, "phases", phase, "label"]),
            `${meta.slug} phase ${phase} label`,
          ).toBe(true);
          expect(
            hasPath(locale as Nested, [...base, "phases", phase, "summary"]),
            `${meta.slug} phase ${phase} summary`,
          ).toBe(true);
        }
      }
    }
  });

  it("keeps EN/FR module card titles for every catalog slug", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      expect(
        hasPath(en as Nested, ["officerLearning", "modules", meta.slug, "title"]),
      ).toBe(true);
      expect(
        hasPath(fr as Nested, ["officerLearning", "modules", meta.slug, "title"]),
      ).toBe(true);
      expect(
        hasPath(en as Nested, [
          "officerLearning",
          "modules",
          meta.slug,
          "summary",
        ]),
      ).toBe(true);
      expect(
        hasPath(fr as Nested, [
          "officerLearning",
          "modules",
          meta.slug,
          "summary",
        ]),
      ).toBe(true);
    }
  });

  it("keeps EN/FR Hub sync panel labels so the dashboard cannot MISSING_MESSAGE", () => {
    expect(
      hasPath(en as Nested, ["officerLearning", "hubSync", "panelLabel"]),
    ).toBe(true);
    expect(
      hasPath(fr as Nested, ["officerLearning", "hubSync", "panelLabel"]),
    ).toBe(true);
  });
});
