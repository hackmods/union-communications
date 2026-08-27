import { describe, expect, it } from "vitest";
import { mergeProgress } from "./merge-progress";

describe("mergeProgress", () => {
  it("prefers completed / quizPassed from either side", () => {
    const merged = mergeProgress(
      {
        "module-1": {
          status: "in_progress",
          scrollDepth: 40,
          quizPassed: false,
        },
      },
      {
        "module-1": {
          status: "completed",
          scrollDepth: 100,
          quizPassed: true,
          lastVisitedAt: "2026-08-01T00:00:00.000Z",
        },
      },
    );
    expect(merged["module-1"]).toMatchObject({
      status: "completed",
      quizPassed: true,
      scrollDepth: 100,
    });
  });

  it("takes max scroll depth when neither is completed", () => {
    const merged = mergeProgress(
      {
        "module-2": { status: "in_progress", scrollDepth: 20, quizPassed: false },
      },
      {
        "module-2": { status: "in_progress", scrollDepth: 55, quizPassed: false },
      },
    );
    expect(merged["module-2"]?.scrollDepth).toBe(55);
  });

  it("keeps modules that exist on only one side", () => {
    const merged = mergeProgress(
      { "module-1": { status: "completed", scrollDepth: 100, quizPassed: true } },
      { "module-3": { status: "in_progress", scrollDepth: 10, quizPassed: false } },
    );
    expect(Object.keys(merged).sort()).toEqual(["module-1", "module-3"]);
  });
});
