import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OFFICER_LEARNING_PROGRESS_EVENT,
  OFFICER_LEARNING_PROGRESS_KEY,
  getAllProgress,
  getModuleProgress,
  markModuleOpened,
  markQuizPassed,
  replaceAllProgress,
  resetAllProgress,
  statusLabelKey,
  updateScrollDepth,
} from "./progress";

describe("officer learning progress", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("defaults unread modules to not started", () => {
    expect(getModuleProgress("module-1")).toEqual({
      status: "not_started",
      scrollDepth: 0,
      quizPassed: false,
    });
  });

  it("marks a module in progress on open unless the quiz already passed", () => {
    const opened = markModuleOpened("module-1");
    expect(opened.status).toBe("in_progress");
    expect(opened.quizPassed).toBe(false);
    expect(opened.lastVisitedAt).toEqual(expect.any(String));

    markQuizPassed("module-1");
    expect(markModuleOpened("module-1").status).toBe("completed");
  });

  it("clamps scroll depth and never decreases it", () => {
    expect(updateScrollDepth("module-2", 150).scrollDepth).toBe(100);
    expect(updateScrollDepth("module-2", -4).scrollDepth).toBe(100);
    expect(updateScrollDepth("module-2", 40).scrollDepth).toBe(100);

    resetAllProgress();
    expect(updateScrollDepth("module-2", 33.4).scrollDepth).toBe(33);
    expect(updateScrollDepth("module-2", 10).scrollDepth).toBe(33);
  });

  it("keeps completed status after a passing quiz even on later scroll", () => {
    markQuizPassed("module-3");
    const next = updateScrollDepth("module-3", 12);
    expect(next).toMatchObject({
      status: "completed",
      quizPassed: true,
      scrollDepth: 100,
    });
  });

  it("treats first positive scroll as in progress", () => {
    expect(updateScrollDepth("module-4", 0).status).toBe("not_started");
    expect(updateScrollDepth("module-4", 1).status).toBe("in_progress");
  });

  it("notifies listeners when a quiz is passed", () => {
    const listener = vi.fn();
    window.addEventListener(OFFICER_LEARNING_PROGRESS_EVENT, listener);
    markQuizPassed("module-1");
    window.removeEventListener(OFFICER_LEARNING_PROGRESS_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getAllProgress()["module-1"]?.quizPassed).toBe(true);
  });

  it("survives corrupt JSON and quota failures", () => {
    window.localStorage.setItem(OFFICER_LEARNING_PROGRESS_KEY, "{not-json");
    expect(getAllProgress()).toEqual({});

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    expect(
      replaceAllProgress({
        "module-1": { status: "completed", scrollDepth: 100, quizPassed: true },
      }),
    ).toBe(false);
  });

  it("maps status labels for the dashboard", () => {
    expect(statusLabelKey("completed")).toBe("progress.completed");
    expect(statusLabelKey("in_progress")).toBe("progress.inProgress");
    expect(statusLabelKey("not_started")).toBe("progress.notStarted");
  });
});
