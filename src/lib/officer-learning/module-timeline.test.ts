import { describe, expect, it } from "vitest";
import { MODULE_TIMELINE_PHASES } from "@/components/officer-learning/ModuleWorkedTimeline";
import { OFFICER_LEARNING_MODULES } from "./modules";

describe("MODULE_TIMELINE_PHASES", () => {
  it("defines timeline phases for every module slug", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      const phases = MODULE_TIMELINE_PHASES[meta.slug];
      expect(phases?.length, meta.slug).toBeGreaterThanOrEqual(4);
    }
  });
});
