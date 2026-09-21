import { describe, expect, it } from "vitest";
import {
  EMPTY_START_PATH_PROGRESS,
  parseStartPathProgress,
  START_PATHS,
  toggleStartPathStep,
} from "./start-paths";
import { PUBLIC_CATALOG } from "./public-catalog";

describe("public start path progress", () => {
  it("safely restores only known paths and steps", () => {
    expect(parseStartPathProgress(JSON.stringify({
      selectedPath: "steward",
      completedStepIds: {
        steward: ["orientation", "not-a-step", "orientation"],
        officer: "invalid",
      },
    }))).toEqual({
      selectedPath: "steward",
      completedStepIds: {
        comms: [],
        steward: ["orientation"],
        officer: [],
      },
    });
  });

  it("returns an empty local journey for invalid browser storage", () => {
    expect(parseStartPathProgress("not-json")).toEqual(EMPTY_START_PATH_PROGRESS);
  });

  it("toggles a valid step without changing other journeys", () => {
    const next = toggleStartPathStep(EMPTY_START_PATH_PROGRESS, "comms", "blueprint");
    expect(next.completedStepIds.comms).toEqual(["blueprint"]);
    expect(toggleStartPathStep(next, "comms", "blueprint").completedStepIds.comms).toEqual([]);
    expect(toggleStartPathStep(next, "steward", "unknown")).toBe(next);
  });

  it("keeps every recommended step on a canonical public catalog route", () => {
    const catalogPaths = new Set(PUBLIC_CATALOG.map((item) => item.canonicalPath));
    for (const path of Object.values(START_PATHS)) {
      for (const step of path) expect(catalogPaths.has(step.href), step.href).toBe(true);
    }
  });
});
